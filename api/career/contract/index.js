const { ensureDb, getActiveCareer } = require("../../../lib/db");
const { getUserFromRequest } = require("../../../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const { brand, weeklyValue, duration, bonus, goals } =
        req.body || {};

    if (!brand || !weeklyValue || !duration) {
        return res
            .status(400)
            .json({ error: "Dados do contrato incompletos." });
    }

    try {
        const db = await ensureDb();
        const career = await getActiveCareer(db, user.userId);

        await db.execute({
            sql:
                "UPDATE contracts SET status = 'ended' WHERE career_id = ? AND status = 'active'",
            args: [career.id]
        });

        const result = await db.execute({
            sql: `INSERT INTO contracts
                    (career_id, brand_name, weekly_value, duration, bonus, goals, status)
                  VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            args: [
                career.id,
                brand,
                weeklyValue,
                duration,
                bonus,
                JSON.stringify(goals || [])
            ]
        });

        res.status(200).json({ id: Number(result.lastInsertRowid) });

    } catch (error) {
        console.error("Erro ao salvar contrato:", error);

        res.status(500).json({
            error:
                "Erro ao salvar contrato: " +
                (error && error.message ? error.message : "desconhecido")
        });
    }
};
