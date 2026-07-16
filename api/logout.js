const { clearAuthCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido." });
    }

    clearAuthCookie(res);

    res.status(200).json({ ok: true });
};
