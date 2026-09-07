const env = require('../config/env');
const sgbauAdapter = require('./sgbau/adapter');
const mockAdapter = require('./mock/adapter');
const logger = require('../utils/logger');

/**
 * To add another university:
 *   1. Create server/src/universities/<code>/{adapter,fetcher,parser,config}.js
 *      implementing the same `checkResult(profile)` interface as sgbau/adapter.js.
 *   2. Register it below, keyed by the `university` value stored on the profile.
 */
const sgbau = env.MOCK_RESULT_MODE ? mockAdapter : sgbauAdapter;
const registry = {
  SGBAU: sgbau,
  'SANT GADGE BABA AMRAVATI UNIVERSITY': sgbau
};

if (env.MOCK_RESULT_MODE) {
  logger.warn('MOCK_RESULT_MODE is enabled — using the mock adapter instead of contacting SGBAU.');
}

function getAdapter(universityCode) {
  const raw = String(universityCode || '').trim().toUpperCase();
  const normalized = /SGBAU|SANT\s+GADGE\s+BABA/.test(raw) ? 'SGBAU' : raw;
  const adapter = registry[normalized];
  if (!adapter) {
    throw new Error(`No adapter registered for university "${universityCode}".`);
  }
  return adapter;
}

module.exports = { getAdapter, registry };
