const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
    stack: env.NODE_ENV === 'production' ? undefined : err.stack
  });

  const status = err.status || 500;
  const body = { error: status === 500 ? 'Internal server error.' : err.message };
  if (env.NODE_ENV !== 'production' && status === 500) {
    body.detail = err.message;
  }
  res.status(status).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

module.exports = { errorHandler, notFoundHandler };
