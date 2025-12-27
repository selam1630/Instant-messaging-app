import { Request, Response } from "express";
import { prisma } from "../config/db";
import { sendOTPEmail } from "../utils/mailer";
const generateNumericOTP = (length: number) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};
export const sendOTP = async (req: Request, res: Response) => {
  const { email, name, phoneNumber } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });
  if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

  try {
    await prisma.oTP.deleteMany({
      where: {
        email,
        OR: [{ expiresAt: { lt: new Date() } }],
      },
    });
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email,
          name: name || null,
          phoneNumber,  
          isVerified: false,
        },
      });
    }
    const otp = generateNumericOTP(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.oTP.create({
      data: { email, code: otp, expiresAt },
    });
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const record = await prisma.oTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.code !== otp.trim())
      return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    // Mark user as verified
    await prisma.user.updateMany({
      where: { email },
      data: { isVerified: true },
    });

    // Delete all OTPs for this email
    await prisma.oTP.deleteMany({ where: { email } });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
