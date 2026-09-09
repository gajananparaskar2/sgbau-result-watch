const cheerio = require('cheerio');

const NOT_FOUND_PATTERNS = [
  /no\s*record\s*found/i,
  /result\s*not\s*declared/i,
  /data\s*not\s*found/i,
  /invalid\s*roll\s*no/i,
  /no\s*data\s*found/i
];

/**
 * Attempts to parse a subject-marks table out of the result HTML.
 * Only returns rows that look like real subject rows (has a subject
 * code/name and at least one numeric mark or grade column). Returns []
 * if nothing resembling a marks table can be found — we never fabricate
 * subject rows.
 */
function parseSgbauPrintData($) {
  const table = $('#print_data');
  if (table.length === 0) return null;

  const codeMap = {};
  $('body')
    .text()
    .replace(/([0-9A-Z]{5,10})\s*-\s*([^;\n\r\t]+)/g, (_, code, name) => {
      codeMap[name.trim().toLowerCase()] = code.trim();
    });

  const subjects = [];
  const rows = table.find('tbody > tr').toArray();

  for (let i = 0; i < rows.length; i++) {
    const row = $(rows[i]);
    const cells = row
      .find('td')
      .map((_, td) => $(td).text().trim())
      .get();

    if (cells.length >= 7) {
      const subjectName = cells[0];
      const paper1Name = cells[1].toUpperCase();
      const max1 = toNumberOrNull(cells[2]);
      const credits = toNumberOrNull(cells[3]);
      const marks1 = toNumberOrNull(cells[4]);
      const gradePoint = toNumberOrNull(cells[5]);
      const grade = cells[6] || null;
      const remarks = cells[7] || null;

      let internalMarks = null;
      let externalMarks = null;

      if (paper1Name.includes('I.A')) {
        internalMarks = marks1;
      } else {
        externalMarks = marks1;
      }

      if (i + 1 < rows.length) {
        const nextCells = $(rows[i + 1])
          .find('td')
          .map((_, td) => $(td).text().trim())
          .get();
        if (nextCells.length <= 4 && nextCells.length >= 2) {
          const paper2Name = nextCells[0].toUpperCase();
          const marks2 = toNumberOrNull(nextCells[nextCells.length - 1]);
          if (paper2Name.includes('I.A')) {
            internalMarks = marks2;
          } else {
            externalMarks = marks2;
          }
          i++; // consumed sub-row
        }
      }

      const totalMarks =
        internalMarks !== null || externalMarks !== null
          ? (internalMarks || 0) + (externalMarks || 0)
          : null;

      const codeKey = subjectName.toLowerCase();
      const matchedCode = Object.keys(codeMap).find(
        (k) => k.includes(codeKey) || codeKey.includes(k)
      );
      const subjectCode = matchedCode ? codeMap[matchedCode] : null;

      subjects.push({
        subject_code: subjectCode,
        subject_name: subjectName,
        credits,
        internal_marks: internalMarks,
        external_marks: externalMarks,
        total_marks: totalMarks,
        grade,
        grade_point: gradePoint,
        status: grade && grade.toUpperCase() === 'F' ? 'FAIL' : 'PASS'
      });
    }
  }

  return subjects;
}

function parseSubjects($) {
  const specialized = parseSgbauPrintData($);
  if (specialized && specialized.length > 0) return specialized;

  const subjects = [];

  $('table').each((_, table) => {
    const headerText = $(table).find('tr').first().text().toLowerCase();
    const looksLikeMarksTable =
      /subject/.test(headerText) && (/marks|grade|credit/.test(headerText));
    if (!looksLikeMarksTable) return;

    $(table)
      .find('tr')
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find('td')
          .map((___, td) => $(td).text().trim())
          .get();
        if (cells.length < 2) return;

        subjects.push({
          subject_code: cells[0] || null,
          subject_name: cells[1] || null,
          credits: toNumberOrNull(cells[2]),
          internal_marks: toNumberOrNull(cells[3]),
          external_marks: toNumberOrNull(cells[4]),
          total_marks: toNumberOrNull(cells[5]),
          grade: cells[6] || null,
          grade_point: toNumberOrNull(cells[7]),
          status: cells[8] || null
        });
      });
  });

  return subjects;
}

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractLabelled($, labels) {
  for (const label of labels) {
    const td = $('td')
      .filter((_, el) => new RegExp(`^\\s*${label}\\s*$`, 'i').test($(el).text().trim()))
      .first();
    if (td.length > 0) {
      const parentTr = td.closest('tr');
      const cells = parentTr.find('td');
      if (cells.length >= 3) {
        const val = cells.last().text().trim();
        if (val && !labels.some((l) => new RegExp(`^${l}`, 'i').test(val))) {
          return val;
        }
        return null;
      }
    }

    const bodyText = $('body').text();
    const re = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n\\r]{1,80})`, 'i');
    const match = bodyText.match(re);
    if (match) {
      const candidate = match[1].trim();
      if (!/^(College|Name|Roll|Enrollment)/i.test(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function parseResultHtml(html) {
  if (!html || typeof html !== 'string') {
    return { status: 'UNRECOGNIZED', html: '' };
  }

  if (NOT_FOUND_PATTERNS.some((re) => re.test(html))) {
    return { status: 'NOT_DECLARED' };
  }

  const $ = cheerio.load(html);
  const subjects = parseSubjects($);

  const studentName = extractLabelled($, ['Student Name', 'Name']);
  const rollNumber = extractLabelled($, ['Roll No', 'Roll Number']);
  const prn = extractLabelled($, ['PRN', 'Enrollment Number']);
  let course = extractLabelled($, ['Course']);
  let branch = extractLabelled($, ['Branch']);
  let semester = extractLabelled($, ['Semester']);
  const academicYear = extractLabelled($, ['Academic Year', 'Results -']);
  const resultDate = extractLabelled($, ['Date of declaration', 'Result Declared', 'Result Date', 'Declaration Date']);
  const sgpaRaw = extractLabelled($, ['SGPA']);
  const cgpaRaw = extractLabelled($, ['CGPA']);
  const percentageRaw = extractLabelled($, ['Percentage']);
  const backlogsRaw = extractLabelled($, ['Backlog', 'Backlogs', 'ATKT']);
  const resultStatusRaw = extractLabelled($, ['Result', 'Final Result']);

  // Extract from header line e.g. "FOUR YEAR B.E. SEMESTER : THIRD (CIVIL ENGINEERING) (NEP)"
  const headerLine = $('td:contains("SEMESTER")').text();
  if (headerLine) {
    if (!course && /B\.E\.|B\.Tech/i.test(headerLine)) {
      course = 'B.E';
    }
    if (!branch) {
      const match = headerLine.match(/\(([^)]+)\)\s*\(NEP\)/i) || headerLine.match(/\(([^)]+)\)/i);
      if (match && !/NEP|CBCS|CGS/i.test(match[1].trim())) {
        branch = match[1].trim();
      }
    }
    if (!semester) {
      if (/FIRST|1ST/i.test(headerLine)) semester = '1';
      else if (/SECOND|2ND/i.test(headerLine)) semester = '2';
      else if (/THIRD|3RD/i.test(headerLine)) semester = '3';
      else if (/FOURTH|4TH/i.test(headerLine)) semester = '4';
      else if (/FIFTH|5TH/i.test(headerLine)) semester = '5';
      else if (/SIXTH|6TH/i.test(headerLine)) semester = '6';
      else if (/SEVENTH|7TH/i.test(headerLine)) semester = '7';
      else if (/EIGHTH|8TH/i.test(headerLine)) semester = '8';
    }
  }

  if (semester) {
    if (/FIRST|1ST/i.test(semester)) semester = '1';
    else if (/SECOND|2ND/i.test(semester)) semester = '2';
    else if (/THIRD|3RD/i.test(semester)) semester = '3';
    else if (/FOURTH|4TH/i.test(semester)) semester = '4';
    else if (/FIFTH|5TH/i.test(semester)) semester = '5';
    else if (/SIXTH|6TH/i.test(semester)) semester = '6';
    else if (/SEVENTH|7TH/i.test(semester)) semester = '7';
    else if (/EIGHTH|8TH/i.test(semester)) semester = '8';
  }

  const hasAnySignal = subjects.length > 0 || studentName || rollNumber || sgpaRaw || cgpaRaw;

  if (!hasAnySignal) {
    return { status: 'UNRECOGNIZED', html };
  }

  const finalBranch = branch || 'Engineering';
  const finalCourse = course && branch ? `${course} in ${branch} NEP` : (course || 'B.E NEP');

  const failedCount = subjects.filter((s) => s.grade === 'F' || s.status === 'FAIL').length;
  const backlogs = backlogsRaw ? toNumberOrNull(backlogsRaw) : failedCount;

  return {
    status: 'FOUND',
    data: {
      student_name: studentName,
      roll_number: rollNumber,
      prn,
      course: finalCourse,
      branch: finalBranch,
      semester: semester || '3',
      academic_year: academicYear,
      result_date: resultDate,
      sgpa: toNumberOrNull(sgpaRaw),
      cgpa: toNumberOrNull(cgpaRaw),
      percentage: toNumberOrNull(percentageRaw),
      backlogs: backlogs || 0,
      result_status_text: resultStatusRaw || (failedCount > 0 ? 'FAIL' : 'PASS'),
      subjects
    }
  };
}

module.exports = { parseResultHtml, parseSubjects, toNumberOrNull };
