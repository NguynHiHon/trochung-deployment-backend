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
  // Timeouts to fail fast on connection issues (ETIMEDOUT)
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 10000,
  // TLS options - some providers require TLS; rejectUnauthorized=false helps when provider uses self-signed certs
  tls: {
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true' ? true : false,
  },
});

// Try to verify transporter at startup to surface connection/auth issues quickly
transporter.verify()
  .then(() => console.log('✅ SMTP transporter verified and ready'))
  .catch(err => console.error('❌ SMTP transporter verification failed (will retry on send):', err && err.code ? err.code : err));

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
