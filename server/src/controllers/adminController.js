const db = require('../database/db');
const env = require('../config/env');

async function dashboard(req, res) {
  const totalUsersRow = await db.prepare('SELECT COUNT(*) c FROM users').get();
  const totalUsers = totalUsersRow ? totalUsersRow.c : 0;

  const activeProfilesRow = await db.prepare('SELECT COUNT(*) c FROM student_profiles WHERE monitoring_enabled = 1').get();
  const activeProfiles = activeProfilesRow ? activeProfilesRow.c : 0;

  const resultsDetectedRow = await db.prepare('SELECT COUNT(*) c FROM results').get();
  const resultsDetected = resultsDetectedRow ? resultsDetectedRow.c : 0;

  const successfulChecksRow = await db.prepare(`SELECT COUNT(*) c FROM monitoring_logs WHERE status = 'success'`).get();
  const successfulChecks = successfulChecksRow ? successfulChecksRow.c : 0;

  const failedChecksRow = await db.prepare(`SELECT COUNT(*) c FROM monitoring_logs WHERE status = 'error'`).get();
  const failedChecks = failedChecksRow ? failedChecksRow.c : 0;

  const lastRun = await db.prepare('SELECT checked_at FROM monitoring_logs ORDER BY checked_at DESC LIMIT 1').get();

  res.json({
    totalUsers,
    activeProfiles,
    resultsDetected,
    successfulChecks,
    failedChecks,
    lastWorkerRun: lastRun ? lastRun.checked_at : null,
    mockMode: env.MOCK_RESULT_MODE
  });
}

async function logs(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const rows = await db
    .prepare(
      `SELECT ml.*, sp.roll_number FROM monitoring_logs ml
       LEFT JOIN student_profiles sp ON sp.id = ml.student_profile_id
       ORDER BY ml.checked_at DESC LIMIT ?`
    )
    .all(limit);

  const masked = rows.map((r) => ({
    ...r,
    roll_number: r.roll_number ? `${r.roll_number.slice(0, 4)}****${r.roll_number.slice(-2)}` : null
  }));
  res.json({ logs: masked });
}

async function getSettings(req, res) {
  const rows = await db.prepare('SELECT * FROM settings').all();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings, defaults: { monitoringIntervalMinutes: env.RESULT_MONITOR_INTERVAL_MINUTES } });
}

async function updateSetting(req, res) {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required.' });
  await db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
  res.json({ ok: true });
}

/** Re-queues a profile for an immediate check on the next worker tick. */
async function retryProfile(req, res) {
  const profile = await db.prepare('SELECT * FROM student_profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  await db.prepare(`UPDATE student_profiles SET next_check_at = datetime('now') WHERE id = ?`).run(profile.id);
  res.json({ ok: true });
}

module.exports = { dashboard, logs, getSettings, updateSetting, retryProfile };
