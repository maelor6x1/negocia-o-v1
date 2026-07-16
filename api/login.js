const bcrypt = require("bcryptjs");
const { ensureDb } = require("../lib/db");
const { setAuthCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const { username, password } = req.body || {};

    const db = await ensureDb();

    const result = await db.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username || ""]
    });

    const user = result.rows[0];

    const passwordMatches =
        user && bcrypt.compareSync(password || "", user.password_hash);

    if (!passwordMatches) {
        return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    setAuthCookie(res, { userId: user.id, username: user.username });

    res.status(200).json({ username: user.username });
};
