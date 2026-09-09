const bcrypt = require('bcryptjs');
const migrate = require('./migrate');
const db = require('./db');
const env = require('../config/env');
const logger = require('../utils/logger');

async function seed() {
  await migrate();

  // Admin user
  const existingAdmin = await db.prepare('SELECT id FROM users WHERE email = ?').get(env.ADMIN_EMAIL);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(env.ADMIN_PASSWORD, 12);
    await db.prepare(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`
    ).run('ResultWatch Admin', env.ADMIN_EMAIL, hash);
    logger.info(`Seeded admin user: ${env.ADMIN_EMAIL}`);
  } else {
    logger.info('Admin user already exists, skipping.');
  }

  // Example dev user + the TEST profile described in the project spec.
  // This is illustrative seed data only — it is NOT hard-coded into any
  // application logic. Production users must add their own profiles.
  const devEmail = 'student@example.com';
  let devUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(devEmail);
  if (!devUser) {
    const hash = bcrypt.hashSync('Student123!', 12);
    const info = await db
      .prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')`)
      .run('Test Student', devEmail, hash);
    devUser = { id: info.lastInsertRowid };
    logger.info(`Seeded dev user: ${devEmail} / Student123!`);
  }

  const existingProfile = await db
    .prepare('SELECT id FROM student_profiles WHERE user_id = ? AND roll_number = ?')
    .get(devUser.id, '24XX123456');

  if (!existingProfile) {
    await db.prepare(
      `INSERT INTO student_profiles
        (user_id, university, roll_number, student_name, course, branch, curriculum,
         semester, exam_type, exam_session, academic_year, monitoring_enabled, monitoring_interval)
       VALUES (?, 'SGBAU', ?, ?, 'B.Tech', 'Computer Science & Engineering', 'NEP',
               '4', 'Regular', 'Summer 2026', NULL, 1, 60)`
    ).run(devUser.id, '24XX123456', 'Test Student');
    logger.info('Seeded example SGBAU test profile (roll 24XX****56).');
  } else {
    logger.info('Example profile already exists, skipping.');
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => {
    logger.error(`Seed error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = seed;
