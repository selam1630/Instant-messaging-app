// src/routes/userRoutes.ts
import { Router } from "express";
import { authenticate } from "../Middleware/authMiddleware";
import { prisma } from "../config/db";

const router = Router();

// Example protected route
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, profileImage: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
