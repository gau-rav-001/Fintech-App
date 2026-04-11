// backend/utils/email.js
const nodemailer = require("nodemailer");

// ── Create transporter ────────────────────────────────────────────────────────
function createTransporter() {
  const isDev = process.env.NODE_ENV !== "production";

  if (process.env.EMAIL_SERVICE === "gmail" || !process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // ✅ FIX: only disable strict TLS in local dev (self-signed certs).
      //         In production, leave tls unset so Node uses the system CA bundle.
      ...(isDev && { tls: { rejectUnauthorized: false } }),
    });
  }

  // Custom SMTP (SendGrid, Mailgun, Brevo, etc.)
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // ✅ same guard for custom SMTP
    ...(isDev && { tls: { rejectUnauthorized: false } }),
  });
}

const transporter = createTransporter();

// ── Verify on startup ─────────────────────────────────────────────────────────
transporter.verify((err) => {
  if (err) {
    console.error("❌ Email transporter FAILED:", err.message);
    console.error("   → Check EMAIL_USER and EMAIL_PASS in .env");
    console.error("   → For Gmail: use App Password (not your Gmail password)");
  } else {
    console.log("✅ Email transporter ready —", process.env.EMAIL_USER);
  }
});

// ── Send OTP Email ────────────────────────────────────────────────────────────
async function sendOTPEmail(toEmail, otp, userName = "User") {
  const info = await transporter.sendMail({
    from:    `"SmartFinance" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: "Your SmartFinance OTP Verification Code",
    text:    `Your OTP code is: ${otp}\nValid for 5 minutes. Do not share it.`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e5e7eb;">
    <h2 style="color:#1A5F3D;margin:0 0 8px;">Hello, ${userName}!</h2>
    <p style="color:#4b5563;margin:0 0 20px;">
      Use the OTP below to complete your login. Valid for <strong>5 minutes</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#f0faf4;border:2px dashed #1A5F3D;border-radius:10px;padding:16px 40px;font-size:36px;font-weight:bold;color:#1A5F3D;letter-spacing:10px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">
      ⚠️ Do <strong>not</strong> share this code. SmartFinance will never ask for your OTP.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px;">© ${new Date().getFullYear()} SmartFinance</p>
</div>`,
  });
  console.log("📧 OTP email sent to:", toEmail, "| MessageId:", info.messageId);
  return info;
}

// ── Send Welcome Email ────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, userName) {
  const info = await transporter.sendMail({
    from:    `"SmartFinance" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: "Welcome to SmartFinance 🎉",
    html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e5e7eb;">
    <h2 style="color:#1A5F3D;">Welcome, ${userName}! 🎉</h2>
    <p style="color:#4b5563;">Your SmartFinance account is ready.</p>
    <a href="${process.env.CLIENT_URL}/onboarding"
       style="display:inline-block;background:#1A5F3D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:12px;">
      Complete My Profile →
    </a>
  </div>
</div>`,
  });
  console.log("📧 Welcome email sent to:", toEmail);
  return info;
}

module.exports = { sendOTPEmail, sendWelcomeEmail };