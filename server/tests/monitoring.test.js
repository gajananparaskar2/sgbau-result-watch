process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test-monitoring.sqlite';
process.env.JWT_SECRET = 'test_secret';
process.env.MOCK_RESULT_MODE = 'true'; // forces the mock adapter, never touches SGBAU

const fs = require('fs');
const path = require('path');

const dbFile = path.resolve(process.cwd(), process.env.DATABASE_PATH);

beforeAll(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});
afterAll(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});

const migrate = require('../src/database/migrate');
const db = require('../src/database/db');
const { checkProfile } = require('../src/services/monitoringService');

migrate();

let userCounter = 0;

function makeProfile(overrides = {}) {
  userCounter += 1;
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash) VALUES ('T', ?, 'x')`
    )
    .run(`t${userCounter}@example.com`);
  const userId = info.lastInsertRowid;

  // Each test profile gets a distinct roll number so result hashes (which are
  // scoped by roll number, not by internal profile id) don't collide across
  // otherwise-identical mock profiles in this test file.
  const rollNumber = overrides.roll_number || `25BD${String(300000 + userCounter).padStart(6, '0')}`;

  const p = db
    .prepare(
      `INSERT INTO student_profiles
        (user_id, university, roll_number, course, branch, curriculum, semester, exam_type, exam_session, monitoring_interval)
       VALUES (?, 'SGBAU', ?, 'B.Tech', 'Computer Science & Engineering', 'NEP', '4', 'Regular', 'Summer 2026', 60)`
    )
    .run(userId, rollNumber);

  return db.prepare('SELECT * FROM student_profiles WHERE id = ?').get(p.lastInsertRowid);
}

describe('Monitoring pipeline (mock adapter)', () => {
  test('first check reports not declared', async () => {
    const profile = makeProfile();
    const outcome = await checkProfile(profile);
    expect(outcome.status).toBe('RESULT_NOT_DECLARED');
  });

  test('second check finds and saves a verified result', async () => {
    const profile = makeProfile();
    await checkProfile(profile); // first call -> not declared, marks profile as "seen" by mock
    const outcome = await checkProfile(profile);
    expect(outcome.status).toBe('RESULT_FOUND');
    expect(outcome.created).toBe(true);

    const stored = db.prepare('SELECT * FROM results WHERE id = ?').get(outcome.resultId);
    expect(stored.result_status).toBe('RESULT_VERIFIED');
  });

  test('a duplicate result is not re-created', async () => {
    const profile = makeProfile();
    await checkProfile(profile);
    const first = await checkProfile(profile);
    const second = await checkProfile(profile);

    expect(first.status).toBe('RESULT_FOUND');
    expect(second.status).toBe('RESULT_FOUND');
    expect(second.created).toBe(false);
    expect(second.resultId).toBe(first.resultId);

    const count = db.prepare('SELECT COUNT(*) c FROM results WHERE student_profile_id = ?').get(profile.id).c;
    expect(count).toBe(1);
  });

  test('one failing profile does not stop processing of others (isolated errors)', async () => {
    const profile = makeProfile();
    // Force an adapter-level crash by pointing to a non-existent university.
    const broken = { ...profile, university: 'NOT_A_REAL_UNIVERSITY' };
    const outcome = await checkProfile(broken);
    expect(outcome.status).toBe('RESULT_FAILED');

    // A subsequent, valid profile still works fine.
    const healthyOutcome = await checkProfile(profile);
    expect(healthyOutcome.status).toBe('RESULT_NOT_DECLARED');
  });

  test('logs a monitoring_logs row for every check', async () => {
    const profile = makeProfile();
    await checkProfile(profile);
    const logs = db.prepare('SELECT * FROM monitoring_logs WHERE student_profile_id = ?').all(profile.id);
    expect(logs.length).toBeGreaterThan(0);
  });
});
