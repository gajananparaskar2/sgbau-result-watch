const { verifyResultBelongsToProfile } = require('../src/services/verificationService');

describe('verifyResultBelongsToProfile', () => {
  const profile = {
    id: 1,
    roll_number: '25BD310555',
    course: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: '4'
  };

  test('verifies when roll number matches exactly', () => {
    const { verified } = verifyResultBelongsToProfile({ roll_number: '25BD310555' }, profile);
    expect(verified).toBe(true);
  });

  test('fails when roll number does not match', () => {
    const { verified, reasons } = verifyResultBelongsToProfile({ roll_number: '25BD999999' }, profile);
    expect(verified).toBe(false);
    expect(reasons.length).toBeGreaterThan(0);
  });

  test('fails when roll number is missing from the result', () => {
    const { verified } = verifyResultBelongsToProfile({ roll_number: null }, profile);
    expect(verified).toBe(false);
  });

  test('roll number match alone is sufficient even with soft mismatches elsewhere', () => {
    const { verified } = verifyResultBelongsToProfile(
      { roll_number: '25BD310555', branch: 'Some Unrelated Branch Text' },
      profile
    );
    expect(verified).toBe(true);
  });
});
