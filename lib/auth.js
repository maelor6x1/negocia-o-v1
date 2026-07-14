const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const COOKIE_NAME = "negotiation_ai_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error(
            "JWT_SECRET não configurada. Defina uma variável de ambiente com um valor aleatório e secreto."
        );
    }

    return process.env.JWT_SECRET;
}

function setAuthCookie(res, payload) {
    const token = jwt.sign(payload, getSecret(), {
        expiresIn: MAX_AGE_SECONDS
    });

    res.setHeader(
        "Set-Cookie",
        cookie.serialize(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: MAX_AGE_SECONDS
        })
    );
}

function clearAuthCookie(res) {
    res.setHeader(
        "Set-Cookie",
        cookie.serialize(COOKIE_NAME, "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0
        })
    );
}

function getUserFromRequest(req) {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];

    if (!token) {
        return null;
    }

    try {
        return jwt.verify(token, getSecret());
    } catch (error) {
        return null;
    }
}

module.exports = { setAuthCookie, clearAuthCookie, getUserFromRequest };
