const db = require('../database/db');
const env = require('../config/env');
const logger = require('../utils/logger');
const { maskRollNumber } = require('../utils/masking');
const { getAdapter } = require('../universities');
const { verifyResultBelongsToProfile } = require('./verificationService');
const { computeResultHash } = require('./hashService');
const { generateResultPdf } = require('../pdf/pdfGenerator');
const { sendResultNotification } = require('../notifications/notificationService');

async function logMonitoring(profileId, status, message, durationMs) {
  await db.prepare(
    `INSERT INTO monitoring_logs (student_profile_id, status, message, duration_ms) VALUES (?, ?, ?, ?)`
  ).run(profileId, status, message, durationMs);
}

function getISTParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(d);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return {
    year: +m.year,
    month: +m.month - 1,
    day: +m.day,
    hour: +m.hour % 24,
    minute: +m.minute,
    second: +m.second
  };
}

function timeStringToMinutes(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function targetISTToUtcSqlite(targetYear, targetMonth, targetDay, targetHour, targetMinute) {
  const targetUtcMs = Date.UTC(targetYear, targetMonth, targetDay, targetHour, targetMinute, 0) - (330 * 60 * 1000);
  const d = new Date(targetUtcMs);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function computeNextCheckAt(profile, fromDate = new Date()) {
  const intervalMinutes = profile.monitoring_interval ? parseInt(profile.monitoring_interval, 10) : (env.RESULT_MONITOR_INTERVAL_MINUTES || 2);

  if (!profile.active_window_enabled) {
    const nextUtc = new Date(fromDate.getTime() + intervalMinutes * 60 * 1000);
    return nextUtc.toISOString().replace('T', ' ').substring(0, 19);
  }

  const startMins = timeStringToMinutes(profile.active_window_start) ?? (16 * 60); // default 16:00
  const endMins = timeStringToMinutes(profile.active_window_end) ?? (20 * 60);     // default 20:00

  const ist = getISTParts(fromDate);
  const currentMins = ist.hour * 60 + ist.minute;

  const startHour = Math.floor(startMins / 60);
  const startMinute = startMins % 60;

  if (currentMins < startMins) {
    // Before active window today -> schedule for today at window start
    return targetISTToUtcSqlite(ist.year, ist.month, ist.day, startHour, startMinute);
  } else if (currentMins >= endMins) {
    // After active window today -> schedule for tomorrow at window start
    return targetISTToUtcSqlite(ist.year, ist.month, ist.day + 1, startHour, startMinute);
  } else {
    // Currently inside active window!
    const nextMins = currentMins + intervalMinutes;
    if (nextMins <= endMins) {
      const nextUtc = new Date(fromDate.getTime() + intervalMinutes * 60 * 1000);
      return nextUtc.toISOString().replace('T', ' ').substring(0, 19);
    } else {
      // Exceeds window -> schedule for tomorrow at window start
      return targetISTToUtcSqlite(ist.year, ist.month, ist.day + 1, startHour, startMinute);
    }
  }
}

async function touchProfileAfterCheck(profile, extra = {}) {
  const nextCheck = computeNextCheckAt(profile, new Date());
  await db.prepare(
    `UPDATE student_profiles
     SET last_checked_at = datetime('now'),
         next_check_at = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(nextCheck, profile.id);
  Object.assign(profile, extra, { next_check_at: nextCheck });
}

async function saveVerifiedResult(profile, resultData, sourceReference, sourceMethod) {
  const hash = computeResultHash({
    university: profile.university,
    rollNumber: profile.roll_number,
    semester: profile.semester,
    examType: profile.exam_type,
    examSession: profile.exam_session,
    academicYear: profile.academic_year,
    subjects: resultData.subjects,
    sgpa: resultData.sgpa,
    cgpa: resultData.cgpa
  });

  const existing = await db
    .prepare('SELECT * FROM results WHERE student_profile_id = ? AND result_hash = ?')
    .get(profile.id, hash);
  if (existing) {
    logger.info(`Duplicate result detected for profile #${profile.id} (hash already stored) — skipping insert, PDF, and notification.`);
    return { result: existing, created: false };
  }

  const insertResult = db.prepare(
    `INSERT INTO results
      (student_profile_id, result_hash, result_date, semester, exam_type, exam_session, academic_year,
       sgpa, cgpa, percentage, backlogs, result_status, raw_source_reference, source_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RESULT_VERIFIED', ?, ?)`
  );
  const info = await insertResult.run(
    profile.id,
    hash,
    resultData.result_date || null,
    resultData.semester || profile.semester,
    profile.exam_type,
    profile.exam_session,
    resultData.academic_year || profile.academic_year || null,
    resultData.sgpa ?? null,
    resultData.cgpa ?? null,
    resultData.percentage ?? null,
    resultData.backlogs ?? null,
    sourceReference,
    sourceMethod
  );

  const resultId = info.lastInsertRowid;

  const insertSubject = db.prepare(
    `INSERT INTO subjects
      (result_id, subject_code, subject_name, credits, internal_marks, external_marks, total_marks, grade, grade_point, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of resultData.subjects || []) {
    await insertSubject.run(
      resultId,
      s.subject_code || null,
      s.subject_name || null,
      s.credits ?? null,
      s.internal_marks ?? null,
      s.external_marks ?? null,
      s.total_marks ?? null,
      s.grade || null,
      s.grade_point ?? null,
      s.status || null
    );
  }

  const result = await db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
  return { result, created: true };
}

/**
 * Runs a single check for one student profile. Never throws — all errors
 * are caught, logged, and reflected in the return value so a batch worker
 * can continue processing the next profile regardless of this one's outcome.
 */
async function checkProfile(profile) {
  const started = Date.now();
  const maskedRoll = maskRollNumber(profile.roll_number);

  try {
    const adapter = getAdapter(profile.university);
    const outcome = await adapter.checkResult(profile);
    const durationMs = Date.now() - started;

    if (outcome.status === 'RESULT_NOT_DECLARED') {
      await logMonitoring(profile.id, 'not_declared', outcome.message, durationMs);
      await touchProfileAfterCheck(profile);
      return { status: 'RESULT_NOT_DECLARED', message: outcome.message };
    }

    if (outcome.status === 'RESULT_FAILED') {
      await logMonitoring(profile.id, 'error', outcome.message, durationMs);
      await touchProfileAfterCheck(profile);
      return { status: 'RESULT_FAILED', message: outcome.message };
    }

    if (outcome.status === 'RESULT_FOUND') {
      const { verified, reasons } = verifyResultBelongsToProfile(outcome.data, profile);

      if (!verified) {
        await logMonitoring(
          profile.id,
          'requires_verification',
          `Result found but failed verification: ${reasons.join(' ')}`,
          durationMs
        );
        await touchProfileAfterCheck(profile);
        return { status: 'RESULT_REQUIRES_VERIFICATION', message: reasons.join(' ') };
      }

      const sourceMethod = profile.university === 'SGBAU' ? 'auto_scrape' : 'auto_scrape';
      const { result, created } = await saveVerifiedResult(profile, outcome.data, outcome.sourceReference, sourceMethod);

      if (created) {
        try {
          const pdfPath = await generateResultPdf(profile, result);
          await db.prepare('UPDATE results SET pdf_path = ? WHERE id = ?').run(pdfPath, result.id);
          result.pdf_path = pdfPath;
        } catch (pdfErr) {
          logger.error(`PDF generation failed for result #${result.id}: ${pdfErr.message}`);
        }

        try {
          await sendResultNotification(profile, result);
        } catch (notifyErr) {
          logger.error(`Notification failed for result #${result.id}: ${notifyErr.message}`);
        }
      }

      await logMonitoring(profile.id, 'success', created ? 'New result saved.' : 'Result already known (duplicate).', durationMs);
      await touchProfileAfterCheck(profile);
      return { status: 'RESULT_FOUND', resultId: result.id, created };
    }

    // Defensive fallback for any unexpected adapter status.
    await logMonitoring(profile.id, 'error', `Unexpected adapter status: ${outcome.status}`, durationMs);
    await touchProfileAfterCheck(profile);
    return { status: 'RESULT_FAILED', message: 'Unexpected adapter response.' };
  } catch (err) {
    const durationMs = Date.now() - started;
    logger.error(`Monitoring check crashed for profile #${profile.id} (roll ${maskedRoll}): ${err.message}`);
    await logMonitoring(profile.id, 'error', err.message, durationMs);
    await touchProfileAfterCheck(profile);
    return { status: 'RESULT_FAILED', message: 'Internal error while checking the result. Will retry later.' };
  }
}

/**
 * Runs checks for every profile that is due (monitoring enabled and
 * next_check_at <= now, or never checked). Used by the scheduler. Each
 * profile is isolated: one failure never stops the batch.
 */
async function runDueChecks() {
  const dueProfiles = await db
    .prepare(
      `SELECT * FROM student_profiles
       WHERE monitoring_enabled = 1
         AND (next_check_at IS NULL OR next_check_at <= datetime('now'))`
    )
    .all();

  logger.info(`Monitoring worker: ${dueProfiles.length} profile(s) due for a check.`);

  const results = [];
  const now = new Date();
  for (const profile of dueProfiles) {
    if (profile.active_window_enabled) {
      const ist = getISTParts(now);
      const currentMins = ist.hour * 60 + ist.minute;
      const startMins = timeStringToMinutes(profile.active_window_start) ?? (16 * 60);
      const endMins = timeStringToMinutes(profile.active_window_end) ?? (20 * 60);

      const inWindow = startMins <= endMins
        ? (currentMins >= startMins && currentMins <= endMins)
        : (currentMins >= startMins || currentMins <= endMins);

      if (!inWindow) {
        const nextCheck = computeNextCheckAt(profile, now);
        await db.prepare(
          `UPDATE student_profiles SET next_check_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(nextCheck, profile.id);
        logger.info(
          `Profile #${profile.id} is outside active window (${profile.active_window_start || '16:00'} - ${profile.active_window_end || '20:00'} IST). Next check postponed to ${nextCheck} UTC.`
        );
        continue;
      }
    }

    // eslint-disable-next-line no-await-in-loop
    const outcome = await checkProfile(profile);
    results.push({ profileId: profile.id, ...outcome });
  }
  return results;
}

module.exports = { checkProfile, runDueChecks, saveVerifiedResult, computeNextCheckAt };
