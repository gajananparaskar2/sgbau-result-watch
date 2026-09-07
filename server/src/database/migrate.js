const fs = require('fs');
const path = require('path');
const db = require('./db');
const logger = require('../utils/logger');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Strip line comments
  schema = schema.replace(/--.*$/gm, '');

  if (db.isTurso) {
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const sql of statements) {
      await db.client.execute(sql);
    }
  } else {
    await db.exec(schema);
  }

  // Add columns to existing tables if missing
  try {
    const rows = await db.prepare(`PRAGMA table_info(student_profiles)`).all();
    const cols = rows.map(c => c.name);
    if (!cols.includes('active_window_enabled')) {
      await db.prepare(`ALTER TABLE student_profiles ADD COLUMN active_window_enabled INTEGER NOT NULL DEFAULT 0`).run();
    }
    if (!cols.includes('active_window_start')) {
      await db.prepare(`ALTER TABLE student_profiles ADD COLUMN active_window_start TEXT DEFAULT '16:00'`).run();
    }
    if (!cols.includes('active_window_end')) {
      await db.prepare(`ALTER TABLE student_profiles ADD COLUMN active_window_end TEXT DEFAULT '20:00'`).run();
    }
  } catch (err) {
    logger.warn(`Column check warning: ${err.message}`);
  }

  logger.info('Database migration complete: all tables ensured.');
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    logger.error(`Migration error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = migrate;
