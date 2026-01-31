"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const db_1 = require("../config/db");
const auth_1 = require("../utils/auth");
const register = async (req, res) => {
    const { name, email, password, profileImage, phoneNumber } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (!existingUser) {
            return res.status(400).json({ message: "Please request OTP first" });
        }
        if (!existingUser.isVerified) {
            return res.status(400).json({ message: "Email not verified. Verify OTP first." });
        }
        if (phoneNumber) {
            const existingPhoneUser = await db_1.prisma.user.findFirst({
                where: { phoneNumber },
            });
            if (existingPhoneUser && existingPhoneUser.email !== email) {
                return res.status(400).json({
                    message: "Phone number already in use",
                });
            }
        }
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const updatedUser = await db_1.prisma.user.update({
            where: { email },
            data: {
                name: name || existingUser.name,
                profileImage: profileImage || existingUser.profileImage,
                passwordHash,
                phoneNumber: phoneNumber || existingUser.phoneNumber,
            },
        });
        const token = (0, auth_1.generateToken)({ userId: updatedUser.id });
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                profileImage: updatedUser.profileImage,
                phoneNumber: updatedUser.phoneNumber,
            },
            token,
        });
    }
    catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!user.passwordHash) {
            return res.status(400).json({ message: "User has not set a password yet" });
        }
        const isPasswordValid = await (0, auth_1.comparePasswords)(password, user.passwordHash);
        if (!isPasswordValid)
            return res.status(401).json({ message: "Invalid password" });
        const token = (0, auth_1.generateToken)({ userId: user.id });
        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
            },
            token,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
