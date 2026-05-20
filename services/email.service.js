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

const FROM = process.env.EMAIL_FROM || '"DecorX Studio" <support@aurainteriors.live>';
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";

const BRAND = {
  orange: "#E8622A",
  orangeLight: "#FDF0EA",
  dark: "#1A1714",
  muted: "#64748B",
  border: "#E5E7EB",
  bg: "#F3F4F6",
  white: "#FFFFFF",
};

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DecorX Studio</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${BRAND.dark}; margin: 0; padding: 0; background-color: ${BRAND.bg};">
  <div style="max-width: 500px; margin: 40px auto; padding: 0 16px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 16px; font-weight: 700; color: ${BRAND.dark}; letter-spacing: 0.25em; text-transform: uppercase;">DECORX</span>
    </div>

    <div style="background-color: ${BRAND.white}; border: 1px solid ${BRAND.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(26, 23, 20, 0.03);">
      <div style="padding: 40px 32px;">
        ${content}
      </div>
    </div>

    <div style="text-align: center; margin-top: 32px; padding-bottom: 40px;">
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
        <tr>
          <td style="padding: 0 10px;">
            <a href="https://instagram.com/decorx" target="_blank" title="Instagram" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-filled/50/64748B/instagram-new.png" alt="Instagram" width="18" height="18" style="display: block; opacity: 0.8;" />
            </a>
          </td>
          <td style="padding: 0 10px;">
            <a href="https://facebook.com/decorx" target="_blank" title="Facebook" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-filled/50/64748B/facebook-new.png" alt="Facebook" width="18" height="18" style="display: block; opacity: 0.8;" />
            </a>
          </td>
          <td style="padding: 0 10px;">
            <a href="https://twitter.com/decorx" target="_blank" title="Twitter / X" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-filled/50/64748B/x.png" alt="Twitter" width="18" height="18" style="display: block; opacity: 0.8;" />
            </a>
          </td>
          <td style="padding: 0 10px;">
            <a href="https://discord.gg/decorx" target="_blank" title="Discord" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-filled/50/64748B/discord-logo.png" alt="Discord" width="18" height="18" style="display: block; opacity: 0.8;" />
            </a>
          </td>
          <td style="padding: 0 10px;">
            <a href="https://youtube.com/decorx" target="_blank" title="YouTube" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-filled/50/64748B/youtube-play.png" alt="YouTube" width="18" height="18" style="display: block; opacity: 0.8;" />
            </a>
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 12px; color: ${BRAND.muted}; line-height: 1.8;">
        DecorX Studio, Chwakpa Tole, Hattiban,<br />
        Lalitpur, 44600 Nepal<br />
        &copy; 2026 DecorX Studio PBC, Inc.
      </p>
    </div>

  </div>
</body>
</html>
`;

const divider = `<div style="height: 1px; background-color: ${BRAND.border}; margin: 28px 0;"></div>`;

const ctaButton = (href, label) =>
  `<a href="${href}" style="display: inline-block; padding: 13px 28px; background-color: ${BRAND.orange}; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
    ${label}
  </a>`;

const securityNote = (msg) =>
  `<table border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: ${BRAND.bg}; border-radius: 8px; margin-top: 24px;">
    <tr>
      <td style="padding: 12px 14px; font-size: 13px; color: ${BRAND.muted}; line-height: 1.5; border-left: 3px solid ${BRAND.border}; border-radius: 0 8px 8px 0;">
        ${msg}
      </td>
    </tr>
  </table>`;

const send = (to, subject, html) =>
  createTransporter().sendMail({ from: FROM, to, subject, html });

exports.sendMagicLinkEmail = (email, magicLink, firstName) =>
  send(
    email,
    "Your sign-in link for DecorX",
    baseTemplate(`
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
        <tr>
          <td style="background-color: ${BRAND.orangeLight}; padding: 12px; border-radius: 10px; text-align: center; vertical-align: middle;">
            <img src="https://img.icons8.com/ios-filled/50/E8622A/lock.png" alt="Lock" width="20" height="20" style="display: block; border: 0;" />
          </td>
        </tr>
      </table>

      <h1 style="text-align: center; margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: ${BRAND.dark}; letter-spacing: -0.4px; line-height: 1.2;">Sign in to DecorX</h1>
      <p style="text-align: center; margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.dark}; line-height: 1.6;">
        Hi ${email} — click the button below to sign in. This link is secure and expires in <strong style="font-weight: 700;">15 minutes</strong>.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
        <tr>
          <td align="center" style="background-color: ${BRAND.orange}; border-radius: 8px; padding: 14px 20px; text-align: center;">
            <a href="${magicLink}" style="display: block; width: 100%; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none;">
              Sign in to my account
            </a>
          </td>
        </tr>
      </table>

      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin: 24px 0;">
        <tr>
          <td style="border-bottom: 1px solid ${BRAND.border}; vertical-align: middle;"></td>
          <td style="padding: 0 12px; text-align: center; font-size: 13px; color: ${BRAND.muted}; white-space: nowrap; vertical-align: middle;">
            or copy this link
          </td>
          <td style="border-bottom: 1px solid ${BRAND.border}; vertical-align: middle;"></td>
        </tr>
      </table>

      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F9FAFB; border: 1px solid ${BRAND.border}; border-radius: 8px; margin-bottom: 24px;">
  <tr>
    <td style="padding: 14px 16px; font-size: 12px; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; color: ${BRAND.muted}; word-break: break-all; line-height: 1.5;">
      <a href="${magicLink}" style="text-decoration: none;">${magicLink}</a>
    </td>
  </tr>
</table>

      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #F9FAFB; border-left: 3px solid #D1D5DB; border-radius: 8px;">
        <tr>
          <td style="padding: 16px; vertical-align: middle;">
            <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
              <tr>
                <td style="width: 18px; vertical-align: top; padding-right: 12px;">
                  <img src="https://img.icons8.com/ios/50/64748B/shield.png" alt="Shield" width="18" height="18" style="display: block; opacity: 0.7; border: 0;" />
                </td>
                <td style="font-size: 13.5px; color: ${BRAND.muted}; line-height: 1.5; vertical-align: middle;">
                  If you didn't request this, you can safely ignore it. Your account remains secure.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `),
  );

exports.sendWelcomeEmail = (email, firstName) =>
  send(
    email,
    "Welcome to DecorX",
    baseTemplate(`
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: ${BRAND.dark}; letter-spacing: -0.3px;">Welcome${firstName ? `, ${firstName}` : ""}!</h1>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND.muted}; line-height: 1.6;">
        Your account is ready. Explore our curated collections of premium luxury furniture and use our AR visualizer to see pieces inside your space before you buy.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        ${ctaButton(`${FRONTEND}/shop`, "Browse the collection")}
      </div>

      ${securityNote("Questions? Just reply to this email — we're happy to help.")}
    `),
  );

exports.sendNewsletterWelcomeEmail = (email) =>
  send(
    email,
    "You're subscribed to DecorX",
    baseTemplate(`
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: ${BRAND.dark}; letter-spacing: -0.3px;">You're on the list</h1>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.muted}; line-height: 1.6;">
        Thanks for subscribing to the DecorX newsletter. Here's what to expect:
      </p>

      <table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
        ${[
        ["Interior trends", "Latest design inspirations and styles"],
        ["Product launches", "Be first to shop exclusive new collections"],
        ["AR spotlights", "Expert tips to visualize furniture in your home"],
        ["Member offers", "Early sale access and subscriber-only promotions"],
      ]
        .map(
          ([title, desc]) => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; vertical-align: top;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BRAND.dark};">${title}</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; color: ${BRAND.muted};">${desc}</p>
            </td>
          </tr>`,
        )
        .join("")}
      </table>

      <div style="text-align: center; margin: 32px 0;">
        ${ctaButton(`${FRONTEND}/shop`, "Browse collections")}
      </div>

      <p style="margin: 0; font-size: 12px; color: ${BRAND.muted}; text-align: center;">
        Didn't subscribe?
        <a href="${FRONTEND}/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: ${BRAND.orange}; text-decoration: underline;">Unsubscribe here</a>.
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
            <p style="margin-top: 32px; font-size: 12px; color: ${BRAND.muted}; text-align: center;">
              You received this because you subscribed to the DecorX newsletter.
              <a href="${FRONTEND}/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: ${BRAND.orange}; text-decoration: underline;">Unsubscribe</a>
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