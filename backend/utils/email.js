// backend/utils/email.js
//
// Dev  → Ethereal Email (fake SMTP, zero setup, no real emails sent)
//         OTP + preview link both printed to your terminal
// Prod → Resend (resend.com — 3,000 free emails/month, 1-min setup)
//         Set RESEND_API_KEY in backend/.env
//         Fallback: any SMTP via EMAIL_HOST / EMAIL_USER / EMAIL_PASS
//
const nodemailer = require("nodemailer");

const isDev = process.env.NODE_ENV !== "production";

// ─────────────────────────────────────────────────────────────────────────────
// DEV — Ethereal (auto-created test account, no signup needed)
// ─────────────────────────────────────────────────────────────────────────────
let _etherealTransporter = null;

async function getEtherealTransporter() {
  if (_etherealTransporter) return _etherealTransporter;

  // Creates a unique test account on ethereal.email each server start
  const testAccount = await nodemailer.createTestAccount();
  _etherealTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("\n📬 Ethereal test account created:");
  console.log("   User:", testAccount.user);
  console.log("   Pass:", testAccount.pass);
  console.log("   Web:  https://ethereal.email/messages  (view sent emails)\n");

  return _etherealTransporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROD — Resend via SMTP bridge
// Get your API key at resend.com → free tier = 3,000 emails/month
// Set in backend/.env:
//   RESEND_API_KEY=re_xxxxxxxxxxxx
//   EMAIL_FROM=noreply@yourdomain.com   (must be a verified domain in Resend)
// ─────────────────────────────────────────────────────────────────────────────
let _prodTransporter = null;

function getProdTransporter() {
  if (_prodTransporter) return _prodTransporter;

  if (process.env.RESEND_API_KEY) {
    // Resend SMTP bridge — no need to install the Resend SDK
    _prodTransporter = nodemailer.createTransport({
      host:   "smtp.resend.com",
      port:   465,
      secure: true,
      auth: {
        user: "resend",                          // always the literal string "resend"
        pass: process.env.RESEND_API_KEY,
      },
    });
    console.log("✅ Email: using Resend (SMTP bridge)");
    return _prodTransporter;
  }

  // Fallback: any SMTP (Gmail, SendGrid, Brevo, etc.)
  // For Gmail use an App Password and port 465
  _prodTransporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.EMAIL_PORT || "465"),
    secure: process.env.EMAIL_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { minVersion: "TLSv1.2" },
  });

  _prodTransporter.verify((err) => {
    if (err) {
      console.warn("⚠️  SMTP transporter not ready:", err.message);
    } else {
      console.log("✅ Email: using SMTP —", process.env.EMAIL_USER);
    }
  });

  return _prodTransporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared send helper
// ─────────────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, text, html) {
  const from = process.env.EMAIL_FROM
    || (isDev ? "SmartFinance <test@smartfinance.dev>" : `"SmartFinance" <${process.env.EMAIL_USER}>`);

  if (isDev) {
    const transport = await getEtherealTransporter();
    const info = await transport.sendMail({ from, to, subject, text, html });

    // Ethereal preview URL — click it to see the formatted email in browser
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📨 Email sent (Ethereal preview):`);
    console.log(`   To     : ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${previewUrl}`);
    console.log(`${"─".repeat(60)}\n`);
    return info;
  }

  // Production
  const transport = getProdTransporter();
  return transport.sendMail({ from, to, subject, text, html });
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP email — also logs the code to terminal in dev
// ─────────────────────────────────────────────────────────────────────────────
async function sendOTPEmail(toEmail, otp, userName = "User") {
  // Always print OTP to terminal — useful in dev even with Ethereal
  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔑  OTP for ${toEmail}: ${otp}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    "Your SmartFinance OTP Code",
    `Your OTP is: ${otp}\nValid for 5 minutes. Do not share it.`,
    `
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
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email
// ─────────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, userName = "User") {
  await sendMail(
    toEmail,
    "Welcome to SmartFinance!",
    `Welcome, ${userName}! Your account is verified and ready to use.`,
    `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#1A5F3D;">Welcome, ${userName}! 🎉</h2>
    <p style="color:#6b7280;">Your SmartFinance account is verified. Start your financial journey today.</p>
  </div>
</div>`
  );
}

module.exports = { sendOTPEmail, sendWelcomeEmail };