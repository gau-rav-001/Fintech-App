// backend/utils/email.js
const nodemailer = require("nodemailer");

const isDev = process.env.NODE_ENV !== "production";

// ── Create transporter ────────────────────────────────────────────────────────
function createTransporter() {
  if (process.env.EMAIL_SERVICE === "gmail" || !process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      ...(isDev && { tls: { rejectUnauthorized: false } }),
    });
  }
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    ...(isDev && { tls: { rejectUnauthorized: false } }),
  });
}

const transporter = createTransporter();

transporter.verify((err) => {
  if (err) {
    console.warn("⚠️  Email transporter not ready:", err.message);
    console.warn("   → OTPs will be logged to console in dev mode.");
  } else {
    console.log("✅ Email transporter ready —", process.env.EMAIL_USER);
  }
});

// ── Dev helper: always print OTP to console ───────────────────────────────────
// This means you never get locked out in development even if email is broken.
function devLog(toEmail, otp, label = "OTP") {
  if (isDev) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`📬 DEV ${label} for ${toEmail}`);
    console.log(`   Code: ${otp}`);
    console.log(`${"─".repeat(50)}\n`);
  }
}

// ── Send OTP Email ────────────────────────────────────────────────────────────
async function sendOTPEmail(toEmail, otp, userName = "User") {
  // Always log in dev — if email also works, both channels deliver the code
  devLog(toEmail, otp, "OTP");

  try {
    await transporter.sendMail({
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
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Hi ${userName},</h2>
    <p style="color:#6b7280;margin:0 0 24px;">Your one-time verification code is:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#f0faf4;border:2px dashed #1A5F3D;border-radius:12px;padding:16px 32px;font-size:36px;font-weight:bold;color:#1A5F3D;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">Valid for <strong>5 minutes</strong>. Do not share this code.</p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Your trusted financial partner</p>
</div>`,
    });
  } catch (err) {
    // In dev, email failure is non-fatal — OTP was already logged to console
    if (isDev) {
      console.warn("📧 Email send failed (dev):", err.message, "— use console OTP above.");
    } else {
      throw err; // In production, fail loudly
    }
  }
}

// ── Send Welcome Email ────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, userName = "User") {
  try {
    await transporter.sendMail({
      from:    `"SmartFinance" <${process.env.EMAIL_USER}>`,
      to:      toEmail,
      subject: "Welcome to SmartFinance!",
      text:    `Welcome, ${userName}! Your account is verified and ready to use.`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#1A5F3D;">Welcome, ${userName}! 🎉</h2>
    <p style="color:#6b7280;">Your SmartFinance account is verified. Start your financial journey today.</p>
  </div>
</div>`,
    });
  } catch (err) {
    if (!isDev) throw err;
    console.warn("📧 Welcome email failed (dev):", err.message);
  }
}

module.exports = { sendOTPEmail, sendWelcomeEmail };