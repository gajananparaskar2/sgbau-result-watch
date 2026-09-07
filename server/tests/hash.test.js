const { computeResultHash } = require('../src/services/hashService');

describe('computeResultHash', () => {
  const base = {
    university: 'SGBAU',
    rollNumber: '25BD310555',
    semester: '4',
    examType: 'Regular',
    examSession: 'Summer 2026',
    academicYear: null,
    subjects: [{ subject_code: 'CS401', total_marks: 78, grade: 'A' }],
    sgpa: 8.42,
    cgpa: 8.31
  };

  test('is deterministic for identical input', () => {
    expect(computeResultHash(base)).toBe(computeResultHash({ ...base }));
  });

  test('is stable regardless of subject array order', () => {
    const reordered = {
      ...base,
      subjects: [
        { subject_code: 'CS402', total_marks: 70, grade: 'B' },
        { subject_code: 'CS401', total_marks: 78, grade: 'A' }
      ]
    };
    const a = computeResultHash({ ...base, subjects: [...reordered.subjects] });
    const b = computeResultHash({ ...base, subjects: [...reordered.subjects].reverse() });
    expect(a).toBe(b);
  });

  test('changes when SGPA changes', () => {
    expect(computeResultHash(base)).not.toBe(computeResultHash({ ...base, sgpa: 9.0 }));
  });

  test('changes for a different roll number', () => {
    expect(computeResultHash(base)).not.toBe(computeResultHash({ ...base, rollNumber: '25BD999999' }));
  });
});
