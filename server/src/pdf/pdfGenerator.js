const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const db = require('../database/db');
const env = require('../config/env');
const { buildResultHtml } = require('./template');
const logger = require('../utils/logger');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildFilename(profile, result) {
  const branchCode = (profile.branch || 'RESULT')
    .replace(/computer science.*engineering/i, 'CSE')
    .replace(/[^a-z0-9]+/gi, '')
    .toUpperCase()
    .slice(0, 10);
  const session = (profile.exam_session || '').replace(/[^a-z0-9]+/gi, '');
  const semClean = String(profile.semester || '1').replace(/[^a-z0-9]+/gi, '').slice(0, 6);
  const roll = (profile.roll_number || result.roll_number || 'UNKNOWN').replace(/[^a-z0-9]+/gi, '');
  return `SGBAU_${branchCode}_Sem${semClean}_${session}_${profile.exam_type || 'Regular'}_${roll}.pdf`;
}

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

async function generateResultPdf(profile, result, customSubjects = null) {
  ensureDir(env.PDF_OUTPUT_DIR);

  const subjects =
    customSubjects || (result.id ? await db.prepare('SELECT * FROM subjects WHERE result_id = ?').all(result.id) : []);
  const html = buildResultHtml({
    profile,
    result: { ...result, student_name: profile.student_name },
    subjects
  });

  const filename = buildFilename(profile, result);
  const outputPath = path.join(env.PDF_OUTPUT_DIR, filename);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
  } finally {
    await page.close();
  }

  logger.info(`Generated result PDF: ${filename}`);
  return outputPath;
}

async function shutdownPdfEngine() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { generateResultPdf, shutdownPdfEngine, buildFilename };
