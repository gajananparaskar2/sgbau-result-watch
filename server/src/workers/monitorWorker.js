const logger = require('../utils/logger');
const { runDueChecks } = require('../services/monitoringService');

async function runOnce() {
  logger.info('Monitoring worker: starting a check pass.');
  const results = await runDueChecks();
  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  logger.info(`Monitoring worker: pass complete. ${JSON.stringify(summary)}`);
  return results;
}

module.exports = { runOnce };
