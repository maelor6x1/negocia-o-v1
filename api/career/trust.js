const { ensureDb, getOrCreateCareer, adjustTrust } = require("../../lib/db");
const { getUserFromRequest } = require("../../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const { brand, delta } = req.body || {};

    if (!brand || typeof delta !== "number") {
        return res
            .status(400)
            .json({ error: "Dados de confiança incompletos." });
    }

    const db = await ensureDb();
    const career = await getOrCreateCareer(db, user.userId);

    const trust = await adjustTrust(db, career.id, brand, delta);

    res.status(200).json({ brand, trust });
};
