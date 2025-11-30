import { Request, Response } from "express";
import { prisma } from "../config/db";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Server error fetching users" });
  }
};
export const getUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log("Requested user ID:", id);

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { onlineStatus: true, lastSeen: true },
    });

    if (!user) {
      console.log("User not found in DB:", id);
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Error fetching user status:", err);
    return res.status(500).json({ message: "Server error fetching user status" });
  }
};

