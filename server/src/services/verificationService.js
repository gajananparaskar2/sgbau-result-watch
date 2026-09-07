const { maskRollNumber } = require('../utils/masking');
const logger = require('../utils/logger');

function normalize(v) {
  return (v || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function rollNumbersMatch(a, b) {
  return normalize(a) !== '' && normalize(a) === normalize(b);
}

function fuzzyContains(haystack, needle) {
  if (!haystack || !needle) return false;
  return normalize(haystack).includes(normalize(needle)) || normalize(needle).includes(normalize(haystack));
}

/**
 * Verifies that `resultData` (as returned by a university adapter/parser)
 * genuinely belongs to `profile`. Roll number is the strongest identifier;
 * name, course, branch and semester are used as supporting corroboration.
 *
 * Returns { verified: boolean, reasons: string[] }.
 * If verified is false, the caller MUST NOT attach the result to the
 * student's account (status becomes RESULT_REQUIRES_VERIFICATION).
 */
function verifyResultBelongsToProfile(resultData, profile) {
  const reasons = [];

  const rollOk = rollNumbersMatch(resultData.roll_number, profile.roll_number);
  if (!rollOk) {
    reasons.push('Roll number on the retrieved result does not match the monitored profile.');
  }

  // Secondary corroboration — logged but not individually fatal, since
  // formatting of course/branch names varies by source.
  if (resultData.course && !fuzzyContains(resultData.course, profile.course)) {
    reasons.push('Course text does not clearly correspond to the profile.');
  }
  if (resultData.branch && !fuzzyContains(resultData.branch, profile.branch)) {
    reasons.push('Branch text does not clearly correspond to the profile.');
  }
  if (resultData.semester && normalize(resultData.semester) !== normalize(String(profile.semester))) {
    // Only a soft signal: the portal's semester text format may legitimately differ.
    reasons.push('Semester text differs in formatting from the profile (soft mismatch).');
  }

  const verified = rollOk; // roll number is the strongest identifier and is required

  if (!verified) {
    logger.warn(
      `Result verification failed for profile #${profile.id} (roll ${maskRollNumber(profile.roll_number)}): ${reasons.join(' ')}`
    );
  }

  return { verified, reasons };
}

module.exports = { verifyResultBelongsToProfile };
