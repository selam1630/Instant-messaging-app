"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/userRoutes.ts
const express_1 = require("express");
const authMiddleware_1 = require("../Middleware/authMiddleware");
const db_1 = require("../config/db");
const router = (0, express_1.Router)();
// Example protected route
router.get("/profile", authMiddleware_1.authenticate, async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, profileImage: true },
        });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json({ user });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
