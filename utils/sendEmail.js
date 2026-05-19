const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM || "Aura Interiors <support@aurainteriors.live>",
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
