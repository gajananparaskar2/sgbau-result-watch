const { loadSearchPage, submitSearch, SgbauBlockedError } = require('./fetcher');
const { parseResultHtml } = require('./parser');
const config = require('./config');
const logger = require('../../utils/logger');
const { maskRollNumber } = require('../../utils/masking');

/**
 * Standard adapter interface (also implemented by universities/mock/adapter.js):
 *
 *   async function checkResult(profile) -> {
 *     status: 'RESULT_NOT_DECLARED' | 'RESULT_FOUND' | 'RESULT_FAILED' | 'RESULT_REQUIRES_VERIFICATION',
 *     data: { ... } | null,       // present only when status === RESULT_FOUND
 *     sourceReference: string,    // URL / description of where this came from
 *     message: string             // human-readable explanation, esp. for FAILED
 *   }
 *
 * The adapter NEVER invents result data. If the portal cannot be queried
 * automatically (CAPTCHA, anti-bot block, unexpected structure), it returns
 * RESULT_FAILED with a message explaining why, so the UI can direct the
 * student to the manual upload fallback (see routes/uploadRoutes.js).
 */

function buildSessionCode(session) {
  if (!session) return 'SE23';
  const raw = String(session).trim().toLowerCase();
  return config.SESSION_CODES[raw] || session;
}

function buildSemesterCode(semester) {
  const n = parseInt(semester, 10);
  return config.SEMESTER_CODES[n] || (String(semester).startsWith('SM') ? semester : (n ? `SM0${n}` : String(semester)));
}

function buildResultTypeCode(examType) {
  const key = String(examType || '').toLowerCase();
  return config.RESULT_TYPE_MAP[key] || (key === 'regular' ? 'R' : examType || 'R');
}

function isAllNepBe(course) {
  if (!course) return false;
  const raw = String(course).trim().toLowerCase();
  return (
    raw === 'all_nep_be' ||
    raw === 'all nep be' ||
    raw === 'all' ||
    /all.*nep.*b\.?e/i.test(raw) ||
    /check.*all.*nep/i.test(raw)
  );
}

function buildCourseCode(course) {
  if (!course) return 'C000032';
  const raw = String(course).trim().toLowerCase();
  if (config.COURSE_CODE_MAP[raw]) return config.COURSE_CODE_MAP[raw];

  // Specific branch matchers prior to generic keywords
  if (/artificial|ai\s*&?\s*ds/i.test(raw)) return 'C000266';
  if (/data\s*science/i.test(raw)) return 'C000317';
  if (/comp(uter)?\s*(engg|engineering)/i.test(raw) && !/science/i.test(raw)) return 'C000027';
  if (/information\s*tech|b\.?e\.?\s*\(?it\)?/i.test(raw)) return 'C000039';
  if (/telecom|etc|extc|electronics\s*&\s*tele/i.test(raw)) return 'C000037';
  if (/electronics\s*&\s*power|elec\.?\s*pow/i.test(raw)) return 'C000043';
  if (/electrical/i.test(raw)) return 'C000034';
  if (/mechanical/i.test(raw)) return 'C000041';
  if (/civil/i.test(raw)) return 'C000031';
  if (/chemical\s*eng/i.test(raw)) return 'C000045';
  if (/iot|internet\s*of\s*things/i.test(raw)) return 'C000314';
  if (/first\s*year/i.test(raw)) return 'C000048';
  if (/textile/i.test(raw)) return 'C000057';
  if (/cse|computer\s*science/i.test(raw)) return 'C000032';
  if (/b\.tech|b\.e/i.test(raw)) return 'C000032';

  return course;
}

async function checkResult(profile) {
  const maskedRoll = maskRollNumber(profile.roll_number);

  try {
    const session = await loadSearchPage();

    if (!session.csrfToken) {
      logger.warn(`SGBAU search page did not expose a recognizable CSRF token for roll ${maskedRoll}.`);
    }

    // If student selected "All NEP B.E", iteratively check all NEP B.E courses until found
    if (isAllNepBe(profile.course)) {
      logger.info(`Auto-checking across all NEP B.E branches for roll ${maskedRoll}...`);

      for (const nepCourse of config.NEP_BE_COURSES) {
        const formFields = {
          [config.FIELD_NAMES.session]: buildSessionCode(profile.exam_session),
          [config.FIELD_NAMES.courseType]: 'UG',
          [config.FIELD_NAMES.course]: nepCourse.code,
          [config.FIELD_NAMES.resultType]: buildResultTypeCode(profile.exam_type),
          [config.FIELD_NAMES.rollNo]: String(profile.roll_number).trim(),
          [config.FIELD_NAMES.semester]: buildSemesterCode(profile.semester)
        };
        if (session.csrfToken) {
          formFields[config.FIELD_NAMES.csrfToken] = session.csrfToken;
        }

        try {
          const html = await submitSearch(formFields, session);
          const parsed = parseResultHtml(html);

          if (parsed.status === 'FOUND') {
            if (!parsed.data.course || parsed.data.course === 'B.E') {
              parsed.data.course = nepCourse.name;
            }
            logger.info(`Matched result for roll ${maskedRoll} in course: ${nepCourse.name} (${nepCourse.code})`);
            return {
              status: 'RESULT_FOUND',
              data: parsed.data,
              sourceReference: config.SEARCH_ENDPOINT,
              message: `Result found in ${nepCourse.name}.`
            };
          }
        } catch (subErr) {
          if (subErr instanceof SgbauBlockedError) throw subErr;
          logger.warn(`Check for ${nepCourse.code} failed: ${subErr.message}`);
        }
      }

      return {
        status: 'RESULT_NOT_DECLARED',
        data: null,
        sourceReference: config.SEARCH_ENDPOINT,
        message: 'SGBAU has not declared this result yet across NEP B.E branches.'
      };
    }

    // Standard single course check
    const formFields = {
      [config.FIELD_NAMES.session]: buildSessionCode(profile.exam_session),
      [config.FIELD_NAMES.courseType]: 'UG',
      [config.FIELD_NAMES.course]: buildCourseCode(profile.course),
      [config.FIELD_NAMES.resultType]: buildResultTypeCode(profile.exam_type),
      [config.FIELD_NAMES.rollNo]: String(profile.roll_number).trim(),
      [config.FIELD_NAMES.semester]: buildSemesterCode(profile.semester)
    };
    if (session.csrfToken) {
      formFields[config.FIELD_NAMES.csrfToken] = session.csrfToken;
    }

    const html = await submitSearch(formFields, session);
    const parsed = parseResultHtml(html);

    if (parsed.status === 'NOT_DECLARED') {
      return {
        status: 'RESULT_NOT_DECLARED',
        data: null,
        sourceReference: config.SEARCH_ENDPOINT,
        message: 'SGBAU has not declared this result yet.'
      };
    }

    if (parsed.status === 'UNRECOGNIZED') {
      return {
        status: 'RESULT_FAILED',
        data: null,
        sourceReference: config.SEARCH_ENDPOINT,
        message:
          'The SGBAU response could not be confidently interpreted (page structure may have changed, ' +
          'or the exact form field names in config.js need verification against the live portal). ' +
          'No result was assumed. Use the manual upload fallback if this persists.'
      };
    }

    // parsed.status === 'FOUND'
    return {
      status: 'RESULT_FOUND',
      data: parsed.data,
      sourceReference: config.SEARCH_ENDPOINT,
      message: 'A result was returned by SGBAU and requires verification before being saved.'
    };
  } catch (err) {
    if (err instanceof SgbauBlockedError) {
      logger.warn(`SGBAU blocked automated access for roll ${maskedRoll}: ${err.reason}`);
      return {
        status: 'RESULT_FAILED',
        data: null,
        sourceReference: config.RESULT_PAGE_URL,
        message: `SGBAU presented an access control (${err.reason}). Automated checking cannot proceed; ` +
          'please use the manual upload fallback once the result is declared.'
      };
    }

    logger.error(`SGBAU adapter error for roll ${maskedRoll}: ${err.message}`);
    return {
      status: 'RESULT_FAILED',
      data: null,
      sourceReference: config.RESULT_PAGE_URL,
      message: `Unable to reach SGBAU (${err.code || err.message}). Will retry on the next scheduled check.`
    };
  }
}

module.exports = { checkResult };
