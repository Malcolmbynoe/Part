const jwt = require("jsonwebtoken");

const SECRET_KEY =
    process.env.JWT_SECRET ||
    "NOVA_CHANGE_THIS_SECRET_KEY";

function createToken(user) {

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        SECRET_KEY,
        {
            expiresIn: "8h"
        }
    );
}

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    const token =
        authHeader &&
        authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

    if (!token) {
        return res.status(401).json({
            error: "Login required."
        });
    }

    try {

        const user =
            jwt.verify(token, SECRET_KEY);

        req.user = user;

        next();

    } catch {

        return res.status(403).json({
            error: "Invalid or expired login."
        });

    }
}

function requireAdmin(req, res, next) {

    if (!req.user || req.user.role !== "admin") {

        return res.status(403).json({
            error: "Administrator access required."
        });
    }

    next();
}

module.exports = {
    createToken,
    authenticateToken,
    requireAdmin
};