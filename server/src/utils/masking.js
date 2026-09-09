/**
 * Masks a roll number for safe logging, e.g. "24XX123456" -> "24XX****56".
 * Keeps the first 4 and last 2 characters visible; masks the middle.
 */
function maskRollNumber(rollNumber) {
  if (!rollNumber || typeof rollNumber !== 'string') return '****';
  const s = rollNumber.trim();
  if (s.length <= 6) return `${s.slice(0, 2)}****`;
  const head = s.slice(0, 4);
  const tail = s.slice(-2);
  const masked = '*'.repeat(Math.max(s.length - head.length - tail.length, 4));
  return `${head}${masked}${tail}`;
}

/**
 * Masks an email for safe logging, e.g. "john.doe@example.com" -> "j***@example.com".
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '****';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

module.exports = { maskRollNumber, maskEmail };
