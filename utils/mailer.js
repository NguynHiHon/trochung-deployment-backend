const nodemailer = require('nodemailer');
require('dotenv').config(); // 🔥 Đảm bảo load .env trong trường hợp file này được require sớm

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

console.log("📧 SMTP loaded:", { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER });

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 465,
  secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendMail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    throw err;
  }
}

module.exports = { sendMail };
