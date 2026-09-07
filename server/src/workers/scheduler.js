const cron = require('node-cron');
require('../database/migrate')().catch(() => {}); // ensure schema exists even if worker starts before the API
const logger = require('../utils/logger');
const { runOnce } = require('./monitorWorker');
const { shutdownPdfEngine } = require('../pdf/pdfGenerator');

logger.info('SGBAU Result Watch — background worker starting.');

// Runs every 1 minute to check for due profiles according to their individual
// intervals (e.g. 2 min, 5 min, 15 min, etc.) and active time windows.
const TICK_CRON = '* * * * *';

let running = false;

async function tick() {
  if (running) {
    logger.warn('Previous monitoring pass still running — skipping this tick.');
    return;
  }
  running = true;
  try {
    await runOnce();
  } catch (err) {
    logger.error(`Monitoring worker tick failed unexpectedly: ${err.message}`);
  } finally {
    running = false;
  }
}

cron.schedule(TICK_CRON, tick);

// Run one pass immediately on boot so the worker doesn't sit idle for up to 5 minutes.
tick();

async function shutdown(signal) {
  logger.info(`Worker received ${signal}, shutting down.`);
  await shutdownPdfEngine();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
