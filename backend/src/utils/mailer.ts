import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Brevo uses STARTTLS, so keep it false
  auth: {
    user: process.env.SMTP_USER, // your SMTP login stays the same
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTPEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: `"Instant Messaging App" <s1649514@gmail.com>`, // ✅ use verified sender
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
  });
};
