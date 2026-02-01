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

export const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Server error fetching user" });
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

export const getOfflineUsersStatus = async (req: Request, res: Response) => {
  try {
    const offlineUsers = await prisma.user.findMany({
      where: { onlineStatus: "offline" },
      select: { id: true, lastSeen: true },
    });
    return res.json(offlineUsers);
  } catch (err) {
    console.error("Error fetching offline users:", err);
    return res.status(500).json({ message: "Failed to fetch offline user statuses" });
  }
};

export const updateProfileImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { profileImage } = req.body;

  if (req.userId !== id) {
    return res.status(403).json({ message: "Unauthorized to update this profile" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { profileImage },
      select: { id: true, profileImage: true },
    });

    return res.json({ message: "Profile image updated successfully", user });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({ message: "Server error updating profile image" });
  }
};
