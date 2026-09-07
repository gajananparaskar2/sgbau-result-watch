const rateLimit = require('express-rate-limit');

// Generic auth endpoints (login/register) — protects against credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' }
});

// Manual "Check Now" — protects the SGBAU portal from being hammered by a
// single user rapidly clicking the button.
const checkNowLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
  message: { error: 'You are checking too frequently. Please wait a few minutes and try again.' }
});

// General API limiter.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, checkNowLimiter, apiLimiter };
