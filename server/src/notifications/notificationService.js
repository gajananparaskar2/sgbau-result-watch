const db = require('../database/db');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');
const env = require('../config/env');

function buildEmailContent(profile, result) {
  const subject = `Your SGBAU ${ordinalSemester(profile.semester)} Semester Result Has Been Declared`;
  const viewUrl = `${env.CLIENT_URL}/results/${result.id}`;

  const text = [
    `Your SGBAU ${ordinalSemester(profile.semester)} Semester ${profile.exam_type} ${profile.exam_session} result`,
    'has been detected.',
    '',
    `Roll Number: ${maskForEmail(profile.roll_number)}`,
    '',
    'Your result is now available in ResultWatch.',
    '',
    `View Result: ${viewUrl}`
  ].join('\n');

  const html = `
    <p>Your SGBAU ${ordinalSemester(profile.semester)} Semester ${profile.exam_type} ${profile.exam_session} result
    has been detected.</p>
    <p><strong>Roll Number:</strong> ${maskForEmail(profile.roll_number)}</p>
    <p>Your result is now available in ResultWatch.</p>
    <p><a href="${viewUrl}">View Result</a></p>
  `;

  return { subject, text, html };
}

function ordinalSemester(n) {
  const num = parseInt(n, 10);
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return `${num}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function maskForEmail(roll) {
  if (!roll) return '****';
  return roll.length > 6 ? `${roll.slice(0, 4)}****${roll.slice(-2)}` : roll;
}

/**
 * Sends the "result declared" notification for a result, but only once
 * per (result, type) — enforced both by an in-DB lookup and a UNIQUE index
 * on notifications(result_id, type) as a hard backstop against race conditions.
 */
async function sendResultNotification(profile, result) {
  const existing = await db
    .prepare(`SELECT * FROM notifications WHERE result_id = ? AND type = 'email'`)
    .get(result.id);

  if (existing) {
    logger.info(`Notification already recorded for result #${result.id} — not sending again.`);
    return existing;
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(profile.user_id);

  // Reserve the row first so a concurrent call can't send twice.
  let notifId;
  try {
    const info = await db
      .prepare(`INSERT INTO notifications (user_id, result_id, type, status) VALUES (?, ?, 'email', 'pending')`)
      .run(profile.user_id, result.id);
    notifId = info.lastInsertRowid;
  } catch (err) {
    // UNIQUE constraint hit — another process already reserved/sent it.
    logger.info(`Notification race avoided for result #${result.id}.`);
    return await db.prepare(`SELECT * FROM notifications WHERE result_id = ? AND type = 'email'`).get(result.id);
  }

  try {
    const { subject, text, html } = buildEmailContent(profile, result);
    const sendOutcome = await sendEmail({ to: user.email, subject, text, html });

    await db.prepare(
      `UPDATE notifications SET status = ?, sent_at = datetime('now') WHERE id = ?`
    ).run(sendOutcome.skipped ? 'disabled' : 'sent', notifId);
  } catch (err) {
    await db.prepare(`UPDATE notifications SET status = 'error', error_message = ? WHERE id = ?`).run(err.message, notifId);
    throw err;
  }

  return await db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
}

module.exports = { sendResultNotification };
