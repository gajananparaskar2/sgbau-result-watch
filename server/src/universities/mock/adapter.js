const logger = require('../../utils/logger');

/**
 * MOCK ADAPTER — development only.
 *
 * Implements the same interface as universities/sgbau/adapter.js so the
 * entire pipeline (parse -> verify -> save -> PDF -> notify) can be
 * exercised without contacting SGBAU. Controlled via MOCK_RESULT_MODE=true.
 *
 * Behaviour: the FIRST check for a given profile returns RESULT_NOT_DECLARED.
 * Every check after that returns a clearly-labelled DEVELOPMENT MOCK RESULT.
 * This mirrors the real "declared eventually" lifecycle for testing.
 */

const seenProfiles = new Set();

async function checkResult(profile) {
  logger.info(`[MOCK] Checking mock result for profile #${profile.id}`);

  if (!seenProfiles.has(profile.id)) {
    seenProfiles.add(profile.id);
    return {
      status: 'RESULT_NOT_DECLARED',
      data: null,
      sourceReference: 'mock://sgbau-adapter',
      message: 'DEVELOPMENT MOCK RESULT: not declared on first check.'
    };
  }

  return {
    status: 'RESULT_FOUND',
    data: {
      student_name: `${profile.student_name || 'DEVELOPMENT MOCK RESULT'}`,
      roll_number: profile.roll_number,
      prn: null,
      course: profile.course,
      branch: profile.branch,
      semester: String(profile.semester),
      academic_year: profile.academic_year,
      result_date: new Date().toISOString().slice(0, 10),
      sgpa: 8.4,
      cgpa: 8.1,
      percentage: 79.5,
      backlogs: 0,
      result_status_text: 'PASS (DEVELOPMENT MOCK RESULT)',
      subjects: [
        {
          subject_code: 'MOCK101',
          subject_name: 'Mock Subject One (DEVELOPMENT MOCK RESULT)',
          credits: 4,
          internal_marks: 18,
          external_marks: 60,
          total_marks: 78,
          grade: 'A',
          grade_point: 9,
          status: 'PASS'
        },
        {
          subject_code: 'MOCK102',
          subject_name: 'Mock Subject Two (DEVELOPMENT MOCK RESULT)',
          credits: 3,
          internal_marks: 16,
          external_marks: 55,
          total_marks: 71,
          grade: 'B+',
          grade_point: 8,
          status: 'PASS'
        }
      ]
    },
    sourceReference: 'mock://sgbau-adapter',
    message: 'DEVELOPMENT MOCK RESULT: a fabricated result for pipeline testing only.'
  };
}

module.exports = { checkResult };
