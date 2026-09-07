const fs = require('fs');
const db = require('../database/db');
const logger = require('../utils/logger');

async function ownedResult(resultId, userId) {
  return await db
    .prepare(
      `SELECT r.*, sp.user_id, sp.roll_number, sp.course, sp.branch, sp.curriculum,
              sp.exam_type as profile_exam_type, sp.exam_session as profile_exam_session,
              sp.student_name as profile_student_name, sp.semester as profile_semester
       FROM results r
       JOIN student_profiles sp ON sp.id = r.student_profile_id
       WHERE r.id = ? AND sp.user_id = ?`
    )
    .get(resultId, userId);
}

async function listResults(req, res) {
  const results = await db
    .prepare(
      `SELECT r.* FROM results r
       JOIN student_profiles sp ON sp.id = r.student_profile_id
       WHERE sp.user_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(req.user.id);
  res.json({ results });
}

async function getResult(req, res) {
  const result = await ownedResult(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Result not found.' });

  const subjects = await db.prepare('SELECT * FROM subjects WHERE result_id = ?').all(result.id);
  res.json({ result, subjects });
}

const path = require('path');
const env = require('../config/env');
const { getAdapter } = require('../universities');
const { saveVerifiedResult } = require('../services/monitoringService');
const { generateResultPdf } = require('../pdf/pdfGenerator');

async function downloadPdf(req, res) {
  const result = await ownedResult(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Result not found.' });
  if (!result.pdf_path || !fs.existsSync(result.pdf_path)) {
    return res.status(404).json({ error: 'PDF not yet generated for this result.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(result.pdf_path)}"`);
  fs.createReadStream(result.pdf_path).pipe(res);
  logger.info(`Result PDF downloaded for result #${result.id}`);
}

async function checkInstant(req, res) {
  const b = req.body || {};
  const rollNumber = String(b.roll_number || b.rollNumber || b.rollNo || '').trim();
  const session = String(b.exam_session || b.session || 'Winter 2025').trim();
  const course = String(b.course || 'B.E in COMPUTER SCIENCE & ENGINEERING NEP').trim();
  const semester = String(b.semester || '3').trim();
  const examType = String(b.exam_type || b.resultType || 'Regular').trim();
  const university = String(b.university || 'SGBAU').trim();

  if (!rollNumber) {
    return res.status(400).json({ error: 'Roll number is required.' });
  }

  const tempProfile = {
    university,
    roll_number: rollNumber,
    course,
    semester,
    exam_type: examType,
    exam_session: session,
    academic_year: b.academic_year || null
  };

  try {
    const adapter = getAdapter(university);
    const outcome = await adapter.checkResult(tempProfile);

    if (outcome.status !== 'RESULT_FOUND') {
      return res.json({
        status: outcome.status,
        message: outcome.message || 'Result not declared yet.',
        data: null
      });
    }

    const resultData = outcome.data;
    let savedResultId = null;
    let pdfFilename = null;
    let pdfPath = null;

    let existingProfile = null;
    if (req.user) {
      existingProfile = await db
        .prepare(
          'SELECT * FROM student_profiles WHERE user_id = ? AND roll_number = ? AND semester = ? AND exam_session = ?'
        )
        .get(req.user.id, rollNumber, semester, session);
    }

    if (existingProfile) {
      const { result } = await saveVerifiedResult(existingProfile, resultData, outcome.sourceReference, 'instant_check');
      savedResultId = result.id;
      pdfPath = result.pdf_path;

      if (!pdfPath || !fs.existsSync(pdfPath)) {
        try {
          pdfPath = await generateResultPdf(existingProfile, result);
          await db.prepare('UPDATE results SET pdf_path = ?, updated_at = datetime("now") WHERE id = ?').run(
            pdfPath,
            result.id
          );
        } catch (e) {
          logger.error(`Failed to generate PDF for instant check: ${e.message}`);
        }
      }
    } else {
      try {
        const dummyResult = {
          id: 0,
          result_date: resultData.result_date,
          semester: resultData.semester || semester,
          exam_type: examType,
          exam_session: session,
          sgpa: resultData.sgpa,
          cgpa: resultData.cgpa,
          percentage: resultData.percentage,
          backlogs: resultData.backlogs || 0,
          result_status: 'RESULT_VERIFIED'
        };
        const profileForPdf = {
          ...tempProfile,
          student_name: resultData.student_name || 'Student Result'
        };
        pdfPath = await generateResultPdf(profileForPdf, dummyResult, resultData.subjects || []);
      } catch (e) {
        logger.error(`Instant PDF generation failed: ${e.message}`);
      }
    }

    if (pdfPath && fs.existsSync(pdfPath)) {
      pdfFilename = path.basename(pdfPath);
    }

    return res.json({
      status: 'RESULT_FOUND',
      data: resultData,
      resultId: savedResultId,
      pdfDownloadUrl: pdfFilename
        ? `/api/results/download-pdf-file/${pdfFilename}`
        : savedResultId
        ? `/api/results/${savedResultId}/pdf`
        : null,
      pdfFilename
    });
  } catch (err) {
    logger.error(`Instant result check error: ${err.message}`);
    return res.status(500).json({ error: `Check failed: ${err.message}` });
  }
}

function downloadPdfByFilename(req, res) {
  const filename = path.basename(req.params.filename);
  if (!filename.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }

  const pdfDir = path.resolve(env.PDF_OUTPUT_DIR);
  const filePath = path.join(pdfDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'PDF file not found.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
  logger.info(`Result PDF downloaded by filename: ${filename}`);
}

async function deleteResult(req, res) {
  const result = await ownedResult(req.params.id, req.user.id);
  if (!result) return res.status(404).json({ error: 'Result not found.' });

  await db.prepare('DELETE FROM results WHERE id = ?').run(result.id);
  res.json({ ok: true });
}

async function deleteResultsBatch(req, res) {
  const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const ids = rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid result IDs provided.' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const userResults = await db.prepare(
    `SELECT r.id FROM results r
     JOIN student_profiles sp ON sp.id = r.student_profile_id
     WHERE sp.user_id = ? AND r.id IN (${placeholders})`
  ).all(req.user.id, ...ids);

  const ownedIds = userResults.map(r => r.id);
  if (ownedIds.length === 0) {
    return res.json({ ok: true, deletedCount: 0 });
  }

  const delPlaceholders = ownedIds.map(() => '?').join(',');
  const info = await db.prepare(`DELETE FROM results WHERE id IN (${delPlaceholders})`).run(...ownedIds);
  logger.info(`User #${req.user.id} batch deleted ${info.changes} result(s).`);
  res.json({ ok: true, deletedCount: info.changes });
}

module.exports = {
  listResults,
  getResult,
  downloadPdf,
  checkInstant,
  downloadPdfByFilename,
  deleteResult,
  deleteResultsBatch
};
