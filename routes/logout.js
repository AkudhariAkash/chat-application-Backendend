const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

let blacklistedTokens = new Set(); // Store invalid tokens after logout

// Middleware to check token validity
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Access denied" });

    if (blacklistedTokens.has(token)) return res.status(403).json({ message: "Invalid session, please log in again" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        req.user = user;
        next();
    });
};

// Logout Route (Now protected)
router.post("/", authenticateToken, async (req, res) => {
    try {
        const token = req.header("Authorization")?.split(" ")[1];

        if (!token) return res.status(400).json({ message: "No token provided" });

        if (blacklistedTokens.has(token)) {
            return res.status(403).json({ message: "Invalid session, please log in again" });
        }

        // Add token to blacklist
        blacklistedTokens.add(token);

        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        res.status(500).json({ message: "Server error during logout" });
    }
});

module.exports = { router, authenticateToken };