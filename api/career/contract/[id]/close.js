const { ensureDb } = require("../../../../lib/db");
const { getUserFromRequest } = require("../../../../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const status =
        req.body && req.body.status === "renewed" ? "renewed" : "ended";

    const db = await ensureDb();

    await db.execute({
        sql: "UPDATE contracts SET status = ? WHERE id = ?",
        args: [status, req.query.id]
    });

    res.status(200).json({ ok: true });
};
