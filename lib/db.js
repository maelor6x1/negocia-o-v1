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
                    signed_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`
            ],
            "write"
        );

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

module.exports = { ensureDb, getOrCreateCareer };
