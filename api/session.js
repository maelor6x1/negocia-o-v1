const { getUserFromRequest } = require("../lib/auth");

module.exports = async function handler(req, res) {
    const user = getUserFromRequest(req);

    if (!user) {
        return res.status(200).json({ authenticated: false });
    }

    res.status(200).json({
        authenticated: true,
        username: user.username
    });
};
