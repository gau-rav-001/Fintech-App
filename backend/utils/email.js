// backend/utils/email.js
const nodemailer = require("nodemailer");

const emailMode = process.env.EMAIL_MODE || (process.env.NODE_ENV !== "production" ? "mock" : "real");
const isMock = emailMode === "mock";

// ─────────────────────────────────────────────────────────────────────────────
// DEV — Ethereal
// ─────────────────────────────────────────────────────────────────────────────
let _etherealTransporter = null;

async function getEtherealTransporter() {
  if (_etherealTransporter) return _etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  _etherealTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log("\n📬 Ethereal test account created:");
  console.log("   User:", testAccount.user);
  console.log("   Pass:", testAccount.pass);
  console.log("   Web:  https://ethereal.email/messages  (view sent emails)\n");
  return _etherealTransporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROD — Resend via SMTP bridge
// ─────────────────────────────────────────────────────────────────────────────
let _prodTransporter = null;

function getProdTransporter() {
  if (_prodTransporter) return _prodTransporter;

  if (process.env.RESEND_API_KEY) {
    _prodTransporter = nodemailer.createTransport({
      host:   "smtp.resend.com",
      port:   465,
      secure: true,
      auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    });
    console.log("✅ Email: using Resend (SMTP bridge)");
    return _prodTransporter;
  }

  _prodTransporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.EMAIL_PORT || "465"),
    secure: process.env.EMAIL_SECURE !== "false",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { minVersion: "TLSv1.2" },
  });

  _prodTransporter.verify((err) => {
    if (err) console.warn("⚠️  SMTP transporter not ready:", err.message);
    else     console.log("✅ Email: using SMTP —", process.env.EMAIL_USER);
  });

  return _prodTransporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared send helper
// ─────────────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, text, html) {
  const from = process.env.EMAIL_FROM
    || (isMock ? "SmartFinance <test@smartfinance.dev>" : `"SmartFinance" <${process.env.EMAIL_USER}>`);

  if (isMock) {
    const transport = await getEtherealTransporter();
    const info      = await transport.sendMail({ from, to, subject, text, html });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📨 Email sent (Ethereal preview):`);
    console.log(`   To     : ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Preview: ${previewUrl}`);
    console.log(`${"─".repeat(60)}\n`);
    return info;
  }

  const transport = getProdTransporter();
  return transport.sendMail({ from, to, subject, text, html });
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP email
// ─────────────────────────────────────────────────────────────────────────────
async function sendOTPEmail(toEmail, otp, userName = "User") {
  if (isMock) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Password reset email
// ─────────────────────────────────────────────────────────────────────────────
async function sendPasswordResetEmail(toEmail, resetLink, userName = "User") {
  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔒  Password reset link for ${toEmail}:`);
    console.log(`    ${resetLink}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    "Reset Your SmartFinance Password",
    `Hi ${userName},\n\nClick the link below to reset your password (valid for 15 minutes):\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
    `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Hi ${userName},</h2>
    <p style="color:#6b7280;margin:0 0 24px;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}"
        style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#2D7A4E);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:bold;">
        Reset Password
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:8px;">
      This link expires in <strong>15 minutes</strong>.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;">
      If you didn't request a password reset, you can safely ignore this email. Your password won't change.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Your trusted financial partner</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor OTP verification email
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorOTPEmail(toEmail, otp, advisorName = "Advisor") {
  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔑  Advisor Verification OTP for ${toEmail}: ${otp}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    "SmartFinance Advisor Portal — Verify Your Email",
    `Your advisor registration verification code is: ${otp}\nValid for 5 minutes. Do not share it with anyone.`,
    `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance Advisor Portal</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Hi ${advisorName},</h2>
    <p style="color:#6b7280;margin:0 0 24px;">Thank you for registering as a financial advisor on SmartFinance. Your verification code is:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#f0faf4;border:2px dashed #1A5F3D;border-radius:12px;padding:16px 32px;font-size:36px;font-weight:bold;color:#1A5F3D;letter-spacing:8px;">${otp}</span>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">Valid for <strong>5 minutes</strong>. Never share this code with anyone.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="color:#9ca3af;font-size:12px;text-align:center;">Once verified, your credentials will be submitted for platform administrator review.</p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance Advisor Network — Confidential</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Client Invitation email
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorInvitationEmail({
  toEmail,
  clientName = "Client",
  advisorName = "Your Advisor",
  firmName = "",
  inviteUrl = "",
  expiresAt = null,
}) {
  const firmDisplay = firmName ? ` from <strong>${firmName}</strong>` : "";
  const expiryText = expiresAt
    ? `This invitation link is valid until <strong>${new Date(expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong> (7 days).`
    : "This invitation link is valid for 7 days.";

  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`✉️  Client Invitation Email to ${toEmail}:`);
    console.log(`   Advisor: ${advisorName} (${firmName || "Independent"})`);
    console.log(`   Link:    ${inviteUrl}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    `${advisorName} has invited you to connect on SmartFinance`,
    `Hi ${clientName},\n\n${advisorName}${firmName ? ` (${firmName})` : ""} has invited you to connect on SmartFinance as your financial advisor.\n\nAccept your invitation here:\n${inviteUrl}\n\n${expiryText}`,
    `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Hi ${clientName},</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0 0 20px;">
      <strong>${advisorName}</strong>${firmDisplay} has invited you to collaborate on your financial plans, investments, and wealth goals on SmartFinance.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${inviteUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#2D7A4E);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:bold;">
        Accept Invitation & Get Started
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:16px 0 0;">
      ${expiryText}
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Secure Financial Advisory Network</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Connection Request email (for existing registered user)
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorConnectionRequestEmail({
  toEmail,
  userName = "Client",
  advisorName = "Your Advisor",
  firmName = "",
  specializations = [],
  notes = "",
}) {
  const firmDisplay = firmName ? ` from <strong>${firmName}</strong>` : "";
  const specDisplay = Array.isArray(specializations) && specializations.length > 0
    ? `<p style="color:#4b5563;font-size:14px;margin:8px 0;"><strong>Specializations:</strong> ${specializations.join(", ")}</p>`
    : "";
  const notesDisplay = notes
    ? `<div style="background:#f3f4f6;border-left:4px solid #1A5F3D;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="color:#374151;font-size:14px;margin:0;font-style:italic;">"${notes}"</p>
       </div>`
    : "";

  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`✉️  Advisor Connection Request Email to ${toEmail}:`);
    console.log(`   Advisor: ${advisorName} (${firmName || "Independent"})`);
    if (notes) console.log(`   Notes:   ${notes}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    `${advisorName} requested to connect with you on SmartFinance`,
    `Hi ${userName},\n\n${advisorName}${firmName ? ` (${firmName})` : ""} has sent you a connection request on SmartFinance.${notes ? `\n\nMessage: "${notes}"` : ""}\n\nPlease log in to your SmartFinance account to review and accept this request.`,
    `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Hi ${userName},</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0 0 16px;">
      <strong>${advisorName}</strong>${firmDisplay} would like to connect with you on SmartFinance to help manage your financial planning and wealth goals.
    </p>
    ${specDisplay}
    ${notesDisplay}
    <p style="color:#4b5563;font-size:14px;line-height:1.5;margin:16px 0 0;">
      Log in to your SmartFinance dashboard to review, accept, or decline this connection request.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      If you do not recognize this advisor, you can safely decline the request in your portal.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Secure Financial Advisory Network</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Connection Accepted email
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorConnectionAcceptedEmail({
  toEmail,
  advisorName = "Advisor",
  clientName = "Client",
  clientEmail = "",
}) {
  const clientDisplay = clientEmail ? `${clientName} (${clientEmail})` : clientName;

  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`✉️  Advisor Connection Accepted Email to ${toEmail}:`);
    console.log(`   Advisor: ${advisorName}`);
    console.log(`   Client:  ${clientDisplay}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    `${clientName} has accepted your connection request on SmartFinance`,
    `Hi ${advisorName},\n\nGood news! ${clientDisplay} has accepted your connection request on SmartFinance.\n\nYou can now view their financial portfolio, goals, and planning metrics directly from your advisor portal.\n\nLog in to your advisor portal to get started.`,
    `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Hi ${advisorName},</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0 0 16px;">
      Great news! <strong>${clientDisplay}</strong> has accepted your connection request on SmartFinance.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.5;margin:0 0 16px;">
      You now have read-only access to collaborate on their investments, debts, and long-term financial goals.
    </p>
    <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#065f46;font-size:14px;margin:0;font-weight:bold;">Client Status: Active</p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      Log in to your SmartFinance Advisor Portal to review your active client roster.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Secure Financial Advisory Network</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Connection Rejected email
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorConnectionRejectedEmail({
  toEmail,
  advisorName = "Advisor",
  clientName = "Client",
  clientEmail = "",
  rejectionReason = "",
}) {
  const clientDisplay = clientEmail ? `${clientName} (${clientEmail})` : clientName;
  const reasonDisplay = rejectionReason
    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Reason provided:</strong> "${rejectionReason}"</p>
       </div>`
    : "";

  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`✉️  Advisor Connection Rejected Email to ${toEmail}:`);
    console.log(`   Advisor: ${advisorName}`);
    console.log(`   Client:  ${clientDisplay}`);
    if (rejectionReason) console.log(`   Reason:  ${rejectionReason}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    `Update on your connection request to ${clientName}`,
    `Hi ${advisorName},\n\n${clientDisplay} has declined your connection request on SmartFinance.${rejectionReason ? `\n\nReason: "${rejectionReason}"` : ""}\n\nNo changes have been made to your active client portfolio.`,
    `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Hi ${advisorName},</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0 0 16px;">
      <strong>${clientDisplay}</strong> has declined your connection request on SmartFinance.
    </p>
    ${reasonDisplay}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      If you believe this was an error, you may reach out to the user through their primary contact channel before sending another request.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Secure Financial Advisory Network</p>
</div>`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor Relationship Terminated email
// ─────────────────────────────────────────────────────────────────────────────
async function sendAdvisorRelationshipTerminatedEmail({
  toEmail,
  advisorName = "Advisor",
  clientName = "Client",
  clientEmail = "",
  reason = "",
}) {
  const clientDisplay = clientEmail ? `${clientName} (${clientEmail})` : clientName;
  const reasonDisplay = reason
    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Reason provided:</strong> "${reason}"</p>
       </div>`
    : "";

  if (isDev) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`✉️  Advisor Relationship Terminated Email to ${toEmail}:`);
    console.log(`   Advisor: ${advisorName}`);
    console.log(`   Client:  ${clientDisplay}`);
    if (reason) console.log(`   Reason:  ${reason}`);
    console.log(`${"─".repeat(60)}\n`);
  }

  await sendMail(
    toEmail,
    `${clientName} has ended your advisory connection on SmartFinance`,
    `Hi ${advisorName},\n\n${clientDisplay} has ended their advisory connection with you on SmartFinance.${reason ? `\n\nReason: "${reason}"` : ""}\n\nYour access to this client's financial portfolio, goals, and planning metrics has been discontinued immediately.\n\nLog in to your advisor portal to view your active client roster.`,
    `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f7f9fb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#1A5F3D,#3FAF7D);padding:12px 28px;border-radius:10px;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">SmartFinance</span>
    </div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Hi ${advisorName},</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.5;margin:0 0 16px;">
      <strong>${clientDisplay}</strong> has ended their advisory connection with you on SmartFinance.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.5;margin:0 0 16px;">
      In accordance with our client privacy and security standards, your access to their financial portfolio, debts, and planning metrics has been discontinued immediately.
    </p>
    ${reasonDisplay}
    <div style="background:#f3f4f6;border-left:4px solid #6b7280;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#374151;font-size:14px;margin:0;font-weight:bold;">Relationship Status: Terminated</p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      Log in to your SmartFinance Advisor Portal to review your current client roster.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">SmartFinance — Secure Financial Advisory Network</p>
</div>`
  );
}

module.exports = {
  sendOTPEmail,
  sendAdvisorOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdvisorInvitationEmail,
  sendAdvisorConnectionRequestEmail,
  sendAdvisorConnectionAcceptedEmail,
  sendAdvisorConnectionRejectedEmail,
  sendAdvisorRelationshipTerminatedEmail,
};