import { Request, Response } from "express";
import { prisma } from "../config/db";
import { hashPassword, comparePasswords, generateToken } from "../utils/auth";

// Register user (complete registration after OTP verification)
export const register = async (req: Request, res: Response) => {
  const { name, email, password, profileImage } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // 1️⃣ Check if user exists (pending user from OTP request)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(400).json({ message: "Please request OTP first" });
    }

    // 2️⃣ Ensure OTP was verified
    if (!existingUser.isVerified) {
      return res.status(400).json({ message: "Email not verified. Verify OTP first." });
    }

    // 3️⃣ Hash password and update user
    const passwordHash = await hashPassword(password);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name: name || existingUser.name,
        profileImage: profileImage || existingUser.profileImage,
        passwordHash,
      },
    });

    // 4️⃣ Generate JWT token
    const token = generateToken({ userId: updatedUser.id });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.passwordHash) {
      return res.status(400).json({ message: "User has not set a password yet" });
    }

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid password" });

    const token = generateToken({ userId: user.id });

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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
