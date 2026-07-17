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

// Cria as tabelas se ainda não existirem. Roda uma vez por instância
// "quente" da função serverless (o flag reseta a cada cold start, mas
// CREATE TABLE IF NOT EXISTS é barato e idempotente).
async function ensureDb() {
    const db = getClient();

    if (!initialized) {
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
                    user_id INTEGER NOT NULL UNIQUE,
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

        // Migração pra bancos criados antes desta coluna existir —
        // CREATE TABLE IF NOT EXISTS não adiciona colunas em tabelas
        // que já existem, então tenta adicionar e ignora se já existir.
        try {
            await db.execute(
                "ALTER TABLE contracts ADD COLUMN seasons_completed INTEGER NOT NULL DEFAULT 0"
            );
        } catch (error) {
            // coluna já existe — tudo certo
        }

        initialized = true;
    }

    return db;
}

async function getOrCreateCareer(db, userId) {
    const existing = await db.execute({
        sql: "SELECT * FROM careers WHERE user_id = ?",
        args: [userId]
    });

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const result = await db.execute({
        sql: "INSERT INTO careers (user_id, player_data) VALUES (?, ?)",
        args: [userId, "{}"]
    });

    return {
        id: Number(result.lastInsertRowid),
        user_id: userId,
        player_data: "{}"
    };
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
    getOrCreateCareer,
    getTrustMap,
    adjustTrust,
    advanceContractSeason
};
