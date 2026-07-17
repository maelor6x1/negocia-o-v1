const { ensureDb, advanceContractSeason } = require("../../../../lib/db");
const { getUserFromRequest } = require("../../../../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const db = await ensureDb();

    const seasonsCompleted = await advanceContractSeason(
        db,
        req.query.id
    );

    if (seasonsCompleted === null) {
        return res
            .status(404)
            .json({ error: "Contrato não encontrado." });
    }

    res.status(200).json({ seasonsCompleted });
};
