"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileImage = exports.getOfflineUsersStatus = exports.getUserStatus = exports.getUser = exports.getAllUsers = void 0;
const db_1 = require("../config/db");
const getAllUsers = async (req, res) => {
    try {
        const users = await db_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
            },
        });
        return res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error fetching users" });
    }
};
exports.getAllUsers = getAllUsers;
const getUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching user:", error);
        return res.status(500).json({ message: "Server error fetching user" });
    }
};
exports.getUser = getUser;
const getUserStatus = async (req, res) => {
    const { id } = req.params;
    console.log("Requested user ID:", id);
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id },
            select: { onlineStatus: true, lastSeen: true },
        });
        if (!user) {
            console.log("User not found in DB:", id);
            return res.status(404).json({ message: "User not found" });
        }
        return res.json(user);
    }
    catch (err) {
        console.error("Error fetching user status:", err);
        return res.status(500).json({ message: "Server error fetching user status" });
    }
};
exports.getUserStatus = getUserStatus;
const getOfflineUsersStatus = async (req, res) => {
    try {
        const offlineUsers = await db_1.prisma.user.findMany({
            where: { onlineStatus: "offline" },
            select: { id: true, lastSeen: true },
        });
        return res.json(offlineUsers);
    }
    catch (err) {
        console.error("Error fetching offline users:", err);
        return res.status(500).json({ message: "Failed to fetch offline user statuses" });
    }
};
exports.getOfflineUsersStatus = getOfflineUsersStatus;
const updateProfileImage = async (req, res) => {
    const { id } = req.params;
    const { profileImage } = req.body;
    if (req.userId !== id) {
        return res.status(403).json({ message: "Unauthorized to update this profile" });
    }
    try {
        const user = await db_1.prisma.user.update({
            where: { id },
            data: { profileImage },
            select: { id: true, profileImage: true },
        });
        return res.json({ message: "Profile image updated successfully", user });
    }
    catch (error) {
        console.error("Error updating profile image:", error);
        return res.status(500).json({ message: "Server error updating profile image" });
    }
};
exports.updateProfileImage = updateProfileImage;
