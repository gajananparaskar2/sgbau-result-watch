const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!env.EMAIL_ENABLED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`Email disabled (EMAIL_ENABLED=false) — skipping send to ${to ? to.replace(/(.{2}).+(@.+)/, '$1***$2') : 'unknown'}.`);
    return { skipped: true };
  }
  const info = await t.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
  return { messageId: info.messageId };
}

module.exports = { sendEmail };
