const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isNonEmptyString(v, maxLen = 255) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLen;
}

function sanitizeString(v) {
  return typeof v === 'string' ? v.trim() : v;
}

module.exports = { isValidEmail, isValidPassword, isNonEmptyString, sanitizeString };
