import { Request, Response } from "express";
import { prisma } from "../config/db";
import { sendOTPEmail } from "../utils/mailer";

// Helper to generate a 6-digit numeric OTP
const generateNumericOTP = (length: number) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // random digit 0-9
  }
  return otp;
};

// Send OTP
export const sendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const otp = generateNumericOTP(6); // 6-digit numeric OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP in database
    await prisma.oTP.create({
      data: { email, code: otp, expiresAt },
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Verify OTP
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

    // Mark user as verified
    await prisma.user.updateMany({
      where: { email },
      data: { isVerified: true },
    });

    // Delete used OTPs
    await prisma.oTP.deleteMany({ where: { email } });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
