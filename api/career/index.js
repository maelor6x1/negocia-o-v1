const { ensureDb, getOrCreateCareer, getTrustMap } = require("../../lib/db");
const { getUserFromRequest } = require("../../lib/auth");

module.exports = async function handler(req, res) {
    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const db = await ensureDb();
    const career = await getOrCreateCareer(db, user.userId);

    if (req.method === "GET") {
        const contractsResult = await db.execute({
            sql:
                "SELECT * FROM contracts WHERE career_id = ? ORDER BY signed_at DESC",
            args: [career.id]
        });

        const contracts = contractsResult.rows;

        const activeContract =
            contracts.find((c) => c.status === "active") || null;

        const trust = await getTrustMap(db, career.id);

        return res.status(200).json({
            player: JSON.parse(career.player_data || "{}"),
            trust,

            activeContract: activeContract && {
                id: activeContract.id,
                brand: activeContract.brand_name,
                weeklyValue: activeContract.weekly_value,
                duration: activeContract.duration,
                bonus: activeContract.bonus,
                goals: JSON.parse(activeContract.goals || "[]")
            },

            history: contracts
                .filter((c) => c.status !== "active")
                .map((c) => ({
                    id: c.id,
                    brand: c.brand_name,
                    weeklyValue: c.weekly_value,
                    duration: c.duration,
                    bonus: c.bonus,
                    status: c.status,
                    signedAt: c.signed_at
                }))
        });
    }

    if (req.method === "PUT") {
        const { player } = req.body || {};

        await db.execute({
            sql:
                "UPDATE careers SET player_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [JSON.stringify(player || {}), career.id]
        });

        return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: "Método não permitido." });
};
