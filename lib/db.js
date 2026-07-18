const { createClient } = require("@libsql/client");

let client = null;
let initialized = false;

function getClient() {
    if (!client) {
        if (!process.env.TURSO_DATABASE_URL) {
            throw new Error(
                "TURSO_DATABASE_URL não configurada. Veja o README para configurar o banco."
            );
        }

        client = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN
        });
    }

    return client;
}

// A tabela "careers" tinha um UNIQUE(user_id) na versão anterior (uma
// carreira por conta). SQLite não permite remover uma constraint com
// ALTER TABLE, então recriamos a tabela sem ela, preservando os dados
// e os IDs (contracts/brand_trust referenciam career_id por número).
async function migrateCareersTableIfNeeded(db) {
    const result = await db.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'careers'"
    );

    if (result.rows.length === 0) {
        return;
    }

    const createSql = String(result.rows[0].sql || "").toUpperCase();

    if (!createSql.includes("UNIQUE")) {
        return;
    }

    await db.batch(
        [
            `CREATE TABLE careers_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                player_data TEXT NOT NULL DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`,
            `INSERT INTO careers_new (id, user_id, player_data, created_at, updated_at)
                SELECT id, user_id, player_data, created_at, updated_at FROM careers`,
            `DROP TABLE careers`,
            `ALTER TABLE careers_new RENAME TO careers`
        ],
        "write"
    );
}

async function ensureDb() {
    const db = getClient();

    if (!initialized) {
        await migrateCareersTableIfNeeded(db);

        await db.batch(
            [
                `CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS careers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    player_data TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS contracts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    career_id INTEGER NOT NULL,
                    brand_name TEXT NOT NULL,
                    weekly_value INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    bonus INTEGER NOT NULL,
                    goals TEXT NOT NULL DEFAULT '[]',
                    status TEXT NOT NULL DEFAULT 'active',
                    seasons_completed INTEGER NOT NULL DEFAULT 0,
                    signed_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS brand_trust (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    career_id INTEGER NOT NULL,
                    brand_name TEXT NOT NULL,
                    trust INTEGER NOT NULL DEFAULT 50,
                    UNIQUE(career_id, brand_name)
                )`
            ],
            "write"
        );

        const columnMigrations = [
            "ALTER TABLE contracts ADD COLUMN seasons_completed INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN active_career_id INTEGER"
        ];

        for (const migration of columnMigrations) {
            try {
                await db.execute(migration);
            } catch (error) {
                // coluna já existe — tudo certo
            }
        }

        initialized = true;
    }

    return db;
}

async function setActiveCareer(db, userId, careerId) {
    await db.execute({
        sql: "UPDATE users SET active_career_id = ? WHERE id = ?",
        args: [careerId, userId]
    });
}

async function getActiveCareer(db, userId) {
    const userResult = await db.execute({
        sql: "SELECT active_career_id FROM users WHERE id = ?",
        args: [userId]
    });

    const activeCareerId =
        userResult.rows.length > 0
            ? userResult.rows[0].active_career_id
            : null;

    if (activeCareerId) {
        const career = await db.execute({
            sql: "SELECT * FROM careers WHERE id = ? AND user_id = ?",
            args: [activeCareerId, userId]
        });

        if (career.rows.length > 0) {
            return career.rows[0];
        }
    }

    const existing = await db.execute({
        sql: "SELECT * FROM careers WHERE user_id = ? ORDER BY id ASC LIMIT 1",
        args: [userId]
    });

    let career;

    if (existing.rows.length > 0) {
        career = existing.rows[0];

    } else {
        const result = await db.execute({
            sql: "INSERT INTO careers (user_id, player_data) VALUES (?, ?)",
            args: [userId, "{}"]
        });

        career = {
            id: Number(result.lastInsertRowid),
            user_id: userId,
            player_data: "{}"
        };
    }

    await setActiveCareer(db, userId, career.id);

    return career;
}

async function listCareers(db, userId) {
    const userResult = await db.execute({
        sql: "SELECT active_career_id FROM users WHERE id = ?",
        args: [userId]
    });

    const activeCareerId =
        userResult.rows.length > 0
            ? userResult.rows[0].active_career_id
            : null;

    const careersResult = await db.execute({
        sql: "SELECT * FROM careers WHERE user_id = ? ORDER BY id ASC",
        args: [userId]
    });

    const careerIds = careersResult.rows.map((c) => c.id);

    let activeContractsByCareer = {};

    if (careerIds.length > 0) {
        const placeholders = careerIds.map(() => "?").join(", ");

        const contractsResult = await db.execute({
            sql: `SELECT career_id, brand_name FROM contracts WHERE status = 'active' AND career_id IN (${placeholders})`,
            args: careerIds
        });

        contractsResult.rows.forEach((row) => {
            activeContractsByCareer[row.career_id] = row.brand_name;
        });
    }

    return careersResult.rows.map((career) => {
        let player = {};

        try {
            player = JSON.parse(career.player_data || "{}");
        } catch (error) {
            player = {};
        }

        return {
            id: career.id,
            isActive: career.id === activeCareerId,
            player,
            activeBrand: activeContractsByCareer[career.id] || null,
            createdAt: career.created_at
        };
    });
}

async function createCareer(db, userId) {
    const result = await db.execute({
        sql: "INSERT INTO careers (user_id, player_data) VALUES (?, ?)",
        args: [userId, "{}"]
    });

    const careerId = Number(result.lastInsertRowid);

    await setActiveCareer(db, userId, careerId);

    return careerId;
}

async function deleteCareer(db, userId, careerId) {
    await db.execute({
        sql: "DELETE FROM contracts WHERE career_id = ?",
        args: [careerId]
    });

    await db.execute({
        sql: "DELETE FROM brand_trust WHERE career_id = ?",
        args: [careerId]
    });

    await db.execute({
        sql: "DELETE FROM careers WHERE id = ? AND user_id = ?",
        args: [careerId, userId]
    });

    const userResult = await db.execute({
        sql: "SELECT active_career_id FROM users WHERE id = ?",
        args: [userId]
    });

    const wasActive =
        userResult.rows.length > 0 &&
        userResult.rows[0].active_career_id === careerId;

    if (wasActive) {
        await db.execute({
            sql: "UPDATE users SET active_career_id = NULL WHERE id = ?",
            args: [userId]
        });
    }
}

async function advanceContractSeason(db, contractId) {
    await db.execute({
        sql:
            "UPDATE contracts SET seasons_completed = seasons_completed + 1 WHERE id = ?",
        args: [contractId]
    });

    const result = await db.execute({
        sql: "SELECT seasons_completed FROM contracts WHERE id = ?",
        args: [contractId]
    });

    return result.rows.length > 0
        ? result.rows[0].seasons_completed
        : null;
}

async function getTrustMap(db, careerId) {
    const result = await db.execute({
        sql: "SELECT brand_name, trust FROM brand_trust WHERE career_id = ?",
        args: [careerId]
    });

    const map = {};

    result.rows.forEach((row) => {
        map[row.brand_name] = row.trust;
    });

    return map;
}

async function adjustTrust(db, careerId, brandName, delta) {
    const existing = await db.execute({
        sql:
            "SELECT trust FROM brand_trust WHERE career_id = ? AND brand_name = ?",
        args: [careerId, brandName]
    });

    const current =
        existing.rows.length > 0 ? existing.rows[0].trust : 50;

    const next = Math.min(
        100,
        Math.max(0, Math.round(current + delta))
    );

    if (existing.rows.length > 0) {
        await db.execute({
            sql:
                "UPDATE brand_trust SET trust = ? WHERE career_id = ? AND brand_name = ?",
            args: [next, careerId, brandName]
        });
    } else {
        await db.execute({
            sql:
                "INSERT INTO brand_trust (career_id, brand_name, trust) VALUES (?, ?, ?)",
            args: [careerId, brandName, next]
        });
    }

    return next;
}

module.exports = {
    ensureDb,
    getActiveCareer,
    setActiveCareer,
    listCareers,
    createCareer,
    deleteCareer,
    getTrustMap,
    adjustTrust,
    advanceContractSeason
};
