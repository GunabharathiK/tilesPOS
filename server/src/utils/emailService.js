const nodemailer = require("nodemailer");

const smtpConfigured =
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_PORT) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS);

let transporter = null;

const getTransporter = () => {
  if (!smtpConfigured) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const getFromAddress = () =>
  process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@example.com";

const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log("[emailService] SMTP not configured. Email not sent.", {
      to,
      subject,
      text,
    });
    return { delivered: false, skipped: true };
  }

  await mailer.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, skipped: false };
};

module.exports = {
  sendEmail,
  smtpConfigured,
};
