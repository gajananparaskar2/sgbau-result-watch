const { toNumberOrNull } = require('../universities/sgbau/parser');

function extractLabelled(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r]{1,80})`, 'i');
    const match = text.match(re);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Best-effort extraction of the fields we care about from raw text pulled
 * out of an uploaded PDF/image result. This is intentionally conservative:
 * anything it can't find stays null rather than being guessed.
 */
function parseResultText(text) {
  if (!text || typeof text !== 'string') {
    return { student_name: null, roll_number: null, sgpa: null, cgpa: null, subjects: [] };
  }

  return {
    student_name: extractLabelled(text, ['Student Name', 'Name']),
    roll_number: extractLabelled(text, ['Roll No', 'Roll Number']),
    prn: extractLabelled(text, ['PRN']),
    course: extractLabelled(text, ['Course']),
    branch: extractLabelled(text, ['Branch']),
    semester: extractLabelled(text, ['Semester']),
    academic_year: extractLabelled(text, ['Academic Year']),
    result_date: extractLabelled(text, ['Result Declared', 'Result Date']),
    sgpa: toNumberOrNull(extractLabelled(text, ['SGPA'])),
    cgpa: toNumberOrNull(extractLabelled(text, ['CGPA'])),
    percentage: toNumberOrNull(extractLabelled(text, ['Percentage'])),
    backlogs: toNumberOrNull(extractLabelled(text, ['Backlog', 'Backlogs', 'ATKT'])),
    result_status_text: extractLabelled(text, ['Result', 'Final Result']),
    subjects: [] // Table extraction from raw text is unreliable; subject rows
    // are intentionally left empty for manual uploads unless a table-aware
    // extractor (e.g. pdf-table-extractor) is added later. The summary
    // fields (SGPA/CGPA/percentage) above are still populated.
  };
}

module.exports = { parseResultText };
