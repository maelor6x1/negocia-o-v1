const {
    ensureDb,
    listCareers,
    createCareer
} = require("../../lib/db");

const { getUserFromRequest } = require("../../lib/auth");

module.exports = async function handler(req, res) {
    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(401).json({ error: "Não autenticado." });
    }

    const db = await ensureDb();

    if (req.method === "GET") {
        const careers = await listCareers(db, user.userId);

        return res.status(200).json({ careers });
    }

    if (req.method === "POST") {
        const careerId = await createCareer(db, user.userId);

        return res.status(200).json({ careerId });
    }

    res.status(405).json({ error: "Método não permitido." });
};
