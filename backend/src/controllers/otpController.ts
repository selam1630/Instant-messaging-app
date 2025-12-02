import { Request, Response } from "express";
import { prisma } from "../config/db";
import otpGenerator from "otp-generator";
import { sendOTPEmail } from "../utils/mailer";

export const sendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await prisma.oTP.create({
      data: { email, code: otp, expiresAt },
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const record = await prisma.oTP.findFirst({
      where: { email, code: otp },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // Mark user as verified if exists OR create a temp verification
    await prisma.user.updateMany({
      where: { email },
      data: { isVerified: true },
    });

    await prisma.oTP.deleteMany({ where: { email } });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
