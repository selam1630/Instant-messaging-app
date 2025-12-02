import nodemailer from "nodemailer";

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "9d2545001@smtp-brevo.com ", // Replace with your Brevo SMTP user
        pass: "RpTgm8SMyJUYAk24", // Replace with your Brevo SMTP password
      },
    });

    const info = await transporter.sendMail({
      from: '"Instant Messaging App" <9d2545001@smtp-brevo.com>', // Replace with SMTP user
      to: "your_email@gmail.com", // Replace with your email to receive test
      subject: "s1649514@gmail.com",
      text: "Hello! This is a test email from nodemailer.",
    });

    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

testEmail();
