const bcrypt = require("bcryptjs");
const { ensureDb, setActiveCareer } = require("../lib/db");
const { setAuthCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const { username, password } = req.body || {};

    if (!username || !password || String(password).length < 6) {
        return res.status(400).json({
            error:
                "Usuário e senha (mínimo 6 caracteres) são obrigatórios."
        });
    }

    const db = await ensureDb();

    const existing = await db.execute({
        sql: "SELECT id FROM users WHERE username = ?",
        args: [username]
    });

    if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Esse usuário já existe." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await db.execute({
        sql: "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        args: [username, passwordHash]
    });

    const userId = Number(result.lastInsertRowid);

    const careerResult = await db.execute({
        sql: "INSERT INTO careers (user_id, player_data) VALUES (?, ?)",
        args: [userId, "{}"]
    });

    // Marca explicitamente essa carreira recém-criada como a ativa —
    // antes isso ficava só por conta da recuperação automática em
    // getActiveCareer(), o que é mais frágil.
    await setActiveCareer(
        db,
        userId,
        Number(careerResult.lastInsertRowid)
    );

    setAuthCookie(res, { userId, username });

    res.status(200).json({ username });
};
