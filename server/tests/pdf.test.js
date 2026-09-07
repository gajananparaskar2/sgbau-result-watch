const { buildResultHtml } = require('../src/pdf/template');
const { buildFilename } = require('../src/pdf/pdfGenerator');

// Note: these tests cover the HTML template and filename logic only. Actually
// rendering a PDF requires a Chromium binary (via Puppeteer), which may not
// be available in restricted/offline CI sandboxes. See README > Testing.

describe('PDF template', () => {
  const profile = {
    roll_number: '25BD310555',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    curriculum: 'NEP',
    semester: '4',
    exam_type: 'Regular',
    exam_session: 'Summer 2026',
    student_name: 'Test Student'
  };
  const result = {
    student_name: 'Test Student',
    academic_year: null,
    result_date: '2026-08-29',
    sgpa: 8.42,
    cgpa: 8.31,
    percentage: 79.5,
    backlogs: 0,
    raw_source_reference: 'https://sgbau.ucanapply.com/result-details'
  };
  const subjects = [
    { subject_code: 'CS401', subject_name: 'Operating Systems', credits: 4, internal_marks: 18, external_marks: 60, total_marks: 78, grade: 'A', grade_point: 9 }
  ];

  test('includes the correct student and marks it as non-official', () => {
    const html = buildResultHtml({ profile, result, subjects });
    expect(html).toContain('25BD310555');
    expect(html).toContain('NOT an official university certificate');
    expect(html).toContain('CS401');
  });

  test('never crashes on missing subjects, showing an explicit empty state', () => {
    const html = buildResultHtml({ profile, result, subjects: [] });
    expect(html).toContain('No subject-wise data was available');
  });

  test('escapes HTML in student-controlled fields', () => {
    const html = buildResultHtml({
      profile: { ...profile, roll_number: '<script>alert(1)</script>' },
      result,
      subjects
    });
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('PDF filename', () => {
  test('builds a descriptive, filesystem-safe filename', () => {
    const profile = {
      branch: 'Computer Science & Engineering',
      semester: '4',
      exam_session: 'Summer 2026',
      exam_type: 'Regular',
      roll_number: '25BD310555'
    };
    const filename = buildFilename(profile, { id: 1 });
    expect(filename).toMatch(/^SGBAU_.*Sem4.*25BD310555\.pdf$/);
    expect(filename).not.toMatch(/[^a-zA-Z0-9._-]/);
  });
});
