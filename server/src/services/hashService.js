const crypto = require('crypto');

/**
 * Builds a deterministic hash from the fields that define a "unique" result,
 * so re-checking the same declared result never creates duplicate rows,
 * duplicate PDFs, or duplicate notifications.
 */
function computeResultHash({ university, rollNumber, semester, examType, examSession, academicYear, subjects, sgpa, cgpa }) {
  const subjectFingerprint = (subjects || [])
    .map((s) => [s.subject_code, s.total_marks, s.grade].join('|'))
    .sort()
    .join(';');

  const raw = [
    (university || '').toUpperCase(),
    (rollNumber || '').toUpperCase(),
    semester,
    examType,
    examSession,
    academicYear || '',
    subjectFingerprint,
    sgpa ?? '',
    cgpa ?? ''
  ].join('::');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { computeResultHash };
