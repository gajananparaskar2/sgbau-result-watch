const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const db = require('../database/db');
const logger = require('../utils/logger');
const { extractTextFromImage } = require('../services/ocrService');
const { parseResultText } = require('../services/textResultParser');
const { verifyResultBelongsToProfile } = require('../services/verificationService');
const { computeResultHash } = require('../services/hashService');
const { generateResultPdf } = require('../pdf/pdfGenerator');
const { sendResultNotification } = require('../notifications/notificationService');

async function uploadResult(req, res) {
  const profile = db
    .prepare('SELECT * FROM student_profiles WHERE id = ? AND user_id = ?')
    .get(req.body.profileId, req.user.id);

  if (!profile) return res.status(404).json({ error: 'Profile not found.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Accepted types: PDF, PNG, JPG, JPEG.' });

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  let extractedText = null;
  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Accepted types: PDF, PNG, JPG, JPEG.' });
    }
  } catch (err) {
    logger.error(`Failed to extract text from upload: ${err.message}`);
    return res.status(422).json({ error: 'Could not read the uploaded file. Please try a clearer scan or a text-based PDF.' });
  }

  if (!extractedText) {
    return res.status(422).json({
      error:
        'Automatic text extraction was not available for this file (OCR is not configured for images). ' +
        'You can still confirm the roll number manually to proceed.',
      requiresManualConfirmation: true
    });
  }

  const parsedResult = parseResultText(extractedText);

  // If the document didn't clearly state a roll number, fall back to what
  // the user typed in the upload form, but flag it as self-declared.
  const rollNumberSource = parsedResult.roll_number ? 'document' : 'user_input';
  if (!parsedResult.roll_number && req.body.rollNumber) {
    parsedResult.roll_number = req.body.rollNumber;
  }

  const { verified, reasons } = verifyResultBelongsToProfile(parsedResult, profile);
  if (!verified) {
    return res.status(422).json({
      error: 'RESULT_REQUIRES_VERIFICATION',
      message:
        'The uploaded document could not be verified against this profile. ' +
        `${reasons.join(' ')} Please re-check the file or roll number and try again.`
    });
  }

  const hash = computeResultHash({
    university: profile.university,
    rollNumber: profile.roll_number,
    semester: profile.semester,
    examType: profile.exam_type,
    examSession: profile.exam_session,
    academicYear: profile.academic_year,
    subjects: parsedResult.subjects,
    sgpa: parsedResult.sgpa,
    cgpa: parsedResult.cgpa
  });

  const existing = await db.prepare('SELECT * FROM results WHERE result_hash = ?').get(hash);
  if (existing) {
    return res.json({ result: existing, created: false, message: 'This result was already recorded.' });
  }

  const info = await db
    .prepare(
      `INSERT INTO results
        (student_profile_id, result_hash, result_date, semester, exam_type, exam_session, academic_year,
         sgpa, cgpa, percentage, backlogs, result_status, raw_source_reference, source_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RESULT_VERIFIED', ?, 'manual_upload')`
    )
    .run(
      profile.id,
      hash,
      parsedResult.result_date || null,
      parsedResult.semester || profile.semester,
      profile.exam_type,
      profile.exam_session,
      parsedResult.academic_year || profile.academic_year || null,
      parsedResult.sgpa ?? null,
      parsedResult.cgpa ?? null,
      parsedResult.percentage ?? null,
      parsedResult.backlogs ?? null,
      `manual_upload:${req.file.originalname} (roll source: ${rollNumberSource})`
    );

  const result = await db.prepare('SELECT * FROM results WHERE id = ?').get(info.lastInsertRowid);

  try {
    const pdfPath = await generateResultPdf(profile, result);
    await db.prepare('UPDATE results SET pdf_path = ? WHERE id = ?').run(pdfPath, result.id);
    result.pdf_path = pdfPath;
  } catch (err) {
    logger.error(`PDF generation failed for uploaded result #${result.id}: ${err.message}`);
  }

  try {
    await sendResultNotification(profile, result);
  } catch (err) {
    logger.error(`Notification failed for uploaded result #${result.id}: ${err.message}`);
  }

  res.status(201).json({ result, created: true });
}

module.exports = { uploadResult };
