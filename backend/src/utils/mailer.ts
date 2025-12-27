import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure:
    (process.env.SMTP_SECURE === "true") || Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 10000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 10000,
});

transporter.verify()
  .then(() => console.log("SMTP transport verified"))
  .catch((err) => console.error("SMTP verify failed:", err));

export const sendOTPEmail = async (email: string, otp: string) => {
  try {
    await transporter.sendMail({
      from: `"Instant Messaging App" <s1649514@gmail.com>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
    });
  } catch (err: any) {
    console.error("Error sending OTP email:", err?.code || err);
    throw new Error("Failed to send OTP email");
  }
};