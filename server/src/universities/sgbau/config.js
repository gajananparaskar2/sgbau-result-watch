const env = require('../../../src/config/env');

/**
 * SGBAU publishes results through its "Smart Examination System" portal at
 * https://sgbau.ucanapply.com/result-details (confirmed live August 2026).
 *
 * The page renders a server-side search form:
 *   Session (dropdown)      -> e.g. "Summer 2026", "Winter 2025"
 *   Course Type (dropdown)  -> UG | PG | PHD
 *   Course (dropdown)       -> populated dynamically after Course Type is chosen
 *   Result Type (dropdown)  -> Regular | Back | Reval | EVS
 *   Roll No (text input)
 *   Semester (dropdown)     -> "Fourth Semester ( Sem - 4)" etc.
 *
 * The page also exposes a CSRF token via <meta name="csrf-token" ...>, which
 * the search form submits alongside the fields above.
 *
 * IMPORTANT — HONESTY ABOUT UNCERTAINTY:
 * The exact HTML `name="..."` attributes of each form field (and whether the
 * search is submitted as a normal form POST vs. an AJAX call to a JSON API)
 * were not directly inspectable through this tool's static page fetch — the
 * dropdown values are rendered by client-side JavaScript. Before relying on
 * this adapter in production you MUST verify the real field names using your
 * browser's Network tab while performing a manual search, then update
 * FIELD_NAMES below to match. Until verified, the adapter will detect
 * malformed/unexpected responses and report RESULT_FAILED rather than
 * guessing at a result.
 */

const FIELD_NAMES = {
  session: process.env.SGBAU_FIELD_SESSION || 'session',
  courseType: process.env.SGBAU_FIELD_COURSE_TYPE || 'COURSETYPE',
  course: process.env.SGBAU_FIELD_COURSE || 'COURSECD',
  resultType: process.env.SGBAU_FIELD_RESULT_TYPE || 'RESULTTYPE',
  rollNo: process.env.SGBAU_FIELD_ROLL_NO || 'ROLLNO',
  semester: process.env.SGBAU_FIELD_SEMESTER || 'SEMCODE',
  csrfToken: process.env.SGBAU_FIELD_CSRF || '_token'
};

// Maps internal or user-supplied session names to portal session option values.
const SESSION_CODES = {
  'winter 2025': 'SE23',
  'summer 2026': 'SE24',
  'summer 2025': 'SE22',
  'winter 2024': 'SE21',
  'summer 2024': 'SE20',
  'winter 2023': 'SE19',
  'summer 2023': 'SE18'
};

// Maps our internal exam_type values to the portal's RESULTTYPE code values.
const RESULT_TYPE_MAP = {
  regular: 'R',
  back: 'B',
  reval: 'RV',
  evs: 'EV'
};

// Maps semester number to the portal's SEMCODE option values.
const SEMESTER_CODES = {
  1: 'SM01',
  2: 'SM02',
  3: 'SM03',
  4: 'SM04',
  5: 'SM05',
  6: 'SM06',
  7: 'SM07',
  8: 'SM08',
  9: 'SM09',
  10: 'SM10'
};

// Common course code mappings
const COURSE_CODE_MAP = {
  'c000032': 'C000032',
  'cse': 'C000032',
  'b.tech': 'C000032',
  'b.e.(cse)': 'C000032',
  'computer science': 'C000032',
  'comp': 'C000027',
  'ds': 'C000317'
};

module.exports = {
  RESULT_PAGE_URL: env.SGBAU_RESULT_URL,
  SEARCH_ENDPOINT: env.SGBAU_RESULT_SEARCH_ENDPOINT,
  FIELD_NAMES,
  RESULT_TYPE_MAP,
  SEMESTER_CODES,
  SESSION_CODES,
  COURSE_CODE_MAP,
  SEMESTER_LABELS: SEMESTER_CODES,
  REQUEST_TIMEOUT_MS: env.RESULT_REQUEST_TIMEOUT_MS,
  MAX_RETRIES: env.RESULT_MAX_RETRIES,
  USER_AGENT:
    'Mozilla/5.0 (compatible; SGBAUResultWatch/1.0; +https://github.com/your-org/sgbau-result-watch) ' +
    'Personal result monitor operated on behalf of a single student, polling at most once per configured interval.'
};
