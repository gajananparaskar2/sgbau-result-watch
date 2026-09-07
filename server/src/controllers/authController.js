const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const env = require('../config/env');
const logger = require('../utils/logger');
const { maskEmail } = require('../utils/masking');
const { isValidEmail, isValidPassword, isNonEmptyString, sanitizeString } = require('../utils/validators');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function register(req, res) {
  const name = sanitizeString(req.body.name);
  const email = sanitizeString(req.body.email || '').toLowerCase();
  const { password, confirmPassword } = req.body;

  if (!isNonEmptyString(name, 100)) return res.status(400).json({ error: 'Name is required.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 12);
  const info = await db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hash, 'user');

  const user = { id: info.lastInsertRowid, name, email, role: 'user' };
  const token = signToken(user);
  setAuthCookie(res, token);

  logger.info(`New user registered: ${maskEmail(email)}`);
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
}

async function login(req, res) {
  const email = sanitizeString(req.body.email || '').toLowerCase();
  const { password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid credentials.' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    logger.info(`Failed login attempt for ${maskEmail(email)}`);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  logger.info(`User logged in: ${maskEmail(email)}`);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ ok: true });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, logout, me };
