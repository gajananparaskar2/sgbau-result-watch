const path = require('path');
require('dotenv').config();

function bool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v).toLowerCase() === 'true';
}

function int(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: int(process.env.PORT, 4000),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  DATABASE_PATH: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/resultwatch.sqlite'),
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || '',
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',

  JWT_SECRET: process.env.JWT_SECRET || 'insecure_dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, false),

  RESULT_MONITOR_INTERVAL_MINUTES: int(process.env.RESULT_MONITOR_INTERVAL_MINUTES, 60),
  RESULT_REQUEST_TIMEOUT_MS: int(process.env.RESULT_REQUEST_TIMEOUT_MS, 20000),
  RESULT_MAX_RETRIES: int(process.env.RESULT_MAX_RETRIES, 3),

  SGBAU_RESULT_URL: process.env.SGBAU_RESULT_URL || 'https://sgbau.ucanapply.com/result-details',
  SGBAU_RESULT_SEARCH_ENDPOINT: process.env.SGBAU_RESULT_SEARCH_ENDPOINT || 'https://sgbau.ucanapply.com/result-details',

  EMAIL_ENABLED: bool(process.env.EMAIL_ENABLED, false),
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: int(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'ResultWatch <no-reply@example.com>',

  MOCK_RESULT_MODE: bool(process.env.MOCK_RESULT_MODE, false),

  UPLOAD_DIR: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  PDF_OUTPUT_DIR: path.resolve(process.cwd(), process.env.PDF_OUTPUT_DIR || './generated-pdfs'),

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ChangeMe123!'
};

if (env.NODE_ENV === 'production' && env.MOCK_RESULT_MODE) {
  // Hard safety rail: mock mode must never silently run in production.
  // eslint-disable-next-line no-console
  console.error('[FATAL] MOCK_RESULT_MODE cannot be true when NODE_ENV=production. Refusing to start.');
  process.exit(1);
}

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'insecure_dev_secret_change_me') {
  // eslint-disable-next-line no-console
  console.error('[FATAL] JWT_SECRET must be set to a real secret in production.');
  process.exit(1);
}

module.exports = env;
