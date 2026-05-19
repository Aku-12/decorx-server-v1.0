const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

const FROM = `"DecorX" <${process.env.EMAIL_FROM}>`;
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body   { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1A1714; margin: 0; padding: 0; background: #F8F9FA; }
    .wrap  { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .container { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .head  { padding: 32px 32px 0 32px; text-align: center; }
    .head h1 { margin: 0; font-size: 24px; font-weight: 700; color: #1A1714; letter-spacing: -0.5px; }
    .body  { padding: 32px; }
    .btn   { display: inline-block; padding: 14px 28px; background: #F27318; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .note  { margin-top: 24px; color: #64748B; font-size: 13px; border-top: 1px solid #F1F5F9; padding-top: 24px; }
    .foot  { text-align: center; padding: 24px 0; color: #94A33B; font-size: 12px; }
    p { margin: 0 0 16px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="container">
      <div class="head">
        <h1>DecorX</h1>
      </div>
      <div class="body">${content}</div>
    </div>
    <div class="foot">
      <p>DecorX &mdash; Redefining luxury furniture</p>
      <p>Chwakpa Tole, Hattiban, Lalitpur, 44600</p>
    </div>
  </div>
</body>
</html>
`;

const send = (to, subject, html) =>
  createTransporter().sendMail({ from: FROM, to, subject, html });

exports.sendMagicLinkEmail = (email, magicLink) =>
  send(
    email,
    "Your DecorX Sign-In Link",
    baseTemplate(`
      <p>Hello 👋</p>
      <p>Click the button below to sign in. This link expires in <strong>15 minutes</strong>.</p>
      <div style="text-align:center;">
        <a href="${magicLink}" class="btn">Sign In to DecorX</a>
      </div>
      <p class="note">
        Or copy this link into your browser:<br />
        <span style="word-break:break-all;color:#F27318;">${magicLink}</span>
      </p>
      <p class="note">If you didn't request this, you can safely ignore this email.</p>
    `),
  );

exports.sendPasswordResetEmail = (email, firstName, resetURL) =>
  send(
    email,
    "Reset Your Password – DecorX",
    baseTemplate(`
      <p>Hi ${firstName || "there"},</p>
      <p>You requested a password reset. Click below — this link expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;">
        <a href="${resetURL}" class="btn">Reset Password</a>
      </div>
      <p class="note">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
    `),
  );

exports.sendWelcomeEmail = (email, firstName) =>
  send(
    email,
    "Welcome to DecorX!",
    baseTemplate(`
      <p>Hi ${firstName || "there"} 👋</p>
      <p>Welcome to DecorX! Your account is all set. Explore our collection and visualize furniture in your space with our AR technology.</p>
      <div style="text-align:center;">
        <a href="${FRONTEND}/shop" class="btn">Browse Our Collection</a>
      </div>
    `),
  );

exports.sendNewsletterWelcomeEmail = (email) =>
  send(
    email,
    "Welcome to the DecorX Newsletter! 🎨",
    baseTemplate(`
      <p>Hello 👋</p>
      <p>Thank you for subscribing! Here's what to expect:</p>
      <ul>
        <li>🎨 Latest interior design trends and inspiration</li>
        <li>🛋️ New product launches and exclusive collections</li>
        <li>📱 AR furniture viewing tips and tricks</li>
        <li>🎁 Special offers and early access to sales</li>
      </ul>
      <div style="text-align:center;">
        <a href="${FRONTEND}/shop" class="btn">Browse Our Collection</a>
      </div>
      <p class="note">
        Didn't subscribe?
        <a href="${FRONTEND}/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#F27318;">Unsubscribe here</a>.
      </p>
    `),
  );

exports.sendNewsletterBroadcast = async (subscribers, subject, htmlContent) => {
  const transporter = createTransporter();
  const BATCH = 50;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < subscribers.length; i += BATCH) {
    const results = await Promise.allSettled(
      subscribers.slice(i, i + BATCH).map(({ email }) =>
        transporter.sendMail({
          from: FROM,
          to: email,
          subject,
          html: baseTemplate(`
            ${htmlContent}
            <p class="note">
              You received this because you subscribed to DecorX newsletter.
              <a href="${FRONTEND}/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#F27318;">Unsubscribe</a>
            </p>
          `),
        }),
      ),
    );
    successful += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;
  }

  console.log(
    `[email] Broadcast: ${successful} sent, ${failed} failed / ${subscribers.length} total`,
  );
  return { successful, failed, total: subscribers.length };
};

exports.verifyEmailConfig = async () => {
  try {
    await createTransporter().verify();
    console.log("[email] Brevo SMTP config is valid");
    return true;
  } catch (err) {
    console.error("[email] Brevo SMTP config error:", err.message);
    return false;
  }
};
