import nodemailer from "nodemailer";

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "9d2545001@smtp-brevo.com",
        pass: "RpTgm8SMyJUYAk24",
      },
    });

    const info = await transporter.sendMail({
      from: '"Instant Messaging App" <s1649514@gmail.com>',  
      to: "sfikru64@gmail.com",
      subject: "Test Email",
      text: "Hello! This is a test email from nodemailer.",
    });

    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

testEmail();
