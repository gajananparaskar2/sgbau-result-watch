const db = require('../database/db');
const env = require('../config/env');
const { isNonEmptyString, sanitizeString } = require('../utils/validators');
const { checkProfile } = require('../services/monitoringService');
const logger = require('../utils/logger');
const { maskRollNumber } = require('../utils/masking');

const ALLOWED_INTERVALS = [2, 5, 10, 15, 30, 60, 120, 360, 720, 1440];

async function listProfiles(req, res) {
  const profiles = await db
    .prepare('SELECT * FROM student_profiles WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ profiles });
}

async function getProfile(req, res) {
  const profile = await db
    .prepare('SELECT * FROM student_profiles WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  res.json({ profile });
}

async function createProfile(req, res) {
  const b = req.body || {};
  const rawUni = sanitizeString(b.university) || 'SGBAU';
  const university = /SGBAU|SANT\s+GADGE\s+BABA/i.test(rawUni) ? 'SGBAU' : rawUni;
  const fields = {
    university,
    roll_number: sanitizeString(b.roll_number),
    student_name: sanitizeString(b.student_name) || null,
    course: sanitizeString(b.course),
    branch: sanitizeString(b.branch),
    curriculum: sanitizeString(b.curriculum) || null,
    semester: sanitizeString(String(b.semester || '')),
    exam_type: sanitizeString(b.exam_type),
    exam_session: sanitizeString(b.exam_session),
    academic_year: sanitizeString(b.academic_year) || null
  };

  for (const key of ['roll_number', 'course', 'branch', 'semester', 'exam_type', 'exam_session']) {
    if (!isNonEmptyString(fields[key])) {
      return res.status(400).json({ error: `Field "${key}" is required.` });
    }
  }

  const interval = ALLOWED_INTERVALS.includes(parseInt(b.monitoring_interval, 10))
    ? parseInt(b.monitoring_interval, 10)
    : 2; // Default to 2 minutes

  const activeWindowEnabled = b.active_window_enabled ? 1 : 0;
  const activeWindowStart = sanitizeString(b.active_window_start) || '16:00';
  const activeWindowEnd = sanitizeString(b.active_window_end) || '20:00';

  const info = await db
    .prepare(
      `INSERT INTO student_profiles
        (user_id, university, roll_number, student_name, course, branch, curriculum,
         semester, exam_type, exam_session, academic_year, monitoring_enabled, monitoring_interval,
         active_window_enabled, active_window_start, active_window_end, next_check_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      req.user.id,
      fields.university,
      fields.roll_number,
      fields.student_name,
      fields.course,
      fields.branch,
      fields.curriculum,
      fields.semester,
      fields.exam_type,
      fields.exam_session,
      fields.academic_year,
      interval,
      activeWindowEnabled,
      activeWindowStart,
      activeWindowEnd
    );

  logger.info(`Profile created for user #${req.user.id}, roll ${maskRollNumber(fields.roll_number)} (interval ${interval}m, window ${activeWindowEnabled ? `${activeWindowStart}-${activeWindowEnd}` : '24/7'})`);
  const profile = await db.prepare('SELECT * FROM student_profiles WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ profile });
}

async function updateProfile(req, res) {
  const profile = await db
    .prepare('SELECT * FROM student_profiles WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  const b = req.body;
  const monitoring_enabled = b.monitoring_enabled === undefined ? profile.monitoring_enabled : b.monitoring_enabled ? 1 : 0;
  const monitoring_interval = ALLOWED_INTERVALS.includes(parseInt(b.monitoring_interval, 10))
    ? parseInt(b.monitoring_interval, 10)
    : profile.monitoring_interval;

  const active_window_enabled = b.active_window_enabled === undefined
    ? profile.active_window_enabled
    : b.active_window_enabled ? 1 : 0;
  const active_window_start = sanitizeString(b.active_window_start) || profile.active_window_start || '16:00';
  const active_window_end = sanitizeString(b.active_window_end) || profile.active_window_end || '20:00';

  await db.prepare(
    `UPDATE student_profiles SET
      student_name = ?, course = ?, branch = ?, curriculum = ?, semester = ?,
      exam_type = ?, exam_session = ?, academic_year = ?,
      monitoring_enabled = ?, monitoring_interval = ?,
      active_window_enabled = ?, active_window_start = ?, active_window_end = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    sanitizeString(b.student_name) ?? profile.student_name,
    sanitizeString(b.course) || profile.course,
    sanitizeString(b.branch) || profile.branch,
    sanitizeString(b.curriculum) ?? profile.curriculum,
    sanitizeString(String(b.semester ?? profile.semester)),
    sanitizeString(b.exam_type) || profile.exam_type,
    sanitizeString(b.exam_session) || profile.exam_session,
    sanitizeString(b.academic_year) ?? profile.academic_year,
    monitoring_enabled,
    monitoring_interval,
    active_window_enabled,
    active_window_start,
    active_window_end,
    profile.id
  );

  const updated = await db.prepare('SELECT * FROM student_profiles WHERE id = ?').get(profile.id);
  res.json({ profile: updated });
}

async function deleteProfile(req, res) {
  const profile = await db
    .prepare('SELECT * FROM student_profiles WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  await db.prepare('DELETE FROM student_profiles WHERE id = ?').run(profile.id);
  res.json({ ok: true });
}

async function deleteProfilesBatch(req, res) {
  const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid profile IDs provided.' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const info = await db.prepare(
    `DELETE FROM student_profiles WHERE user_id = ? AND id IN (${placeholders})`
  ).run(req.user.id, ...ids);

  logger.info(`User #${req.user.id} batch deleted ${info.changes} profile(s).`);
  res.json({ ok: true, deletedCount: info.changes });
}

/**
 * Manual "Check Now" — runs the same pipeline as the background worker,
 * synchronously, for a single profile owned by the requesting user.
 */
async function checkNow(req, res) {
  const profile = await db
    .prepare('SELECT * FROM student_profiles WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  try {
    const outcome = await checkProfile(profile);
    res.json({ outcome });
  } catch (err) {
    logger.error(`Manual check failed for profile #${profile.id}: ${err.message}`);
    res.status(500).json({
      error: 'Unable to check the result right now. Automatic monitoring will retry later.'
    });
  }
}

module.exports = { listProfiles, getProfile, createProfile, updateProfile, deleteProfile, deleteProfilesBatch, checkNow };
