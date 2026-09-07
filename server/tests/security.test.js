process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test-security.sqlite';
process.env.JWT_SECRET = 'test_secret';
process.env.MOCK_RESULT_MODE = 'false';

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const dbFile = path.resolve(process.cwd(), process.env.DATABASE_PATH);

beforeAll(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});
afterAll(() => {
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});

const app = require('../src/app');
const db = require('../src/database/db');

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register').send({
    name: 'User',
    email,
    password: 'Password123',
    confirmPassword: 'Password123'
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return res.headers['set-cookie'];
}

describe('Security', () => {
  test('rejects registration with an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X', email: 'not-an-email', password: 'Password123', confirmPassword: 'Password123'
    });
    expect(res.status).toBe(400);
  });

  test('rejects registration with a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X', email: 'short@example.com', password: 'short', confirmPassword: 'short'
    });
    expect(res.status).toBe(400);
  });

  test('rejects mismatched passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'X', email: 'mismatch@example.com', password: 'Password123', confirmPassword: 'Different123'
    });
    expect(res.status).toBe(400);
  });

  test("users cannot access another user's result", async () => {
    const cookieA = await registerAndLogin('userA@example.com');
    const cookieB = await registerAndLogin('userB@example.com');

    const createRes = await request(app)
      .post('/api/profiles')
      .set('Cookie', cookieA)
      .send({
        roll_number: '25BD310555',
        course: 'B.Tech',
        branch: 'Computer Science & Engineering',
        semester: '4',
        exam_type: 'Regular',
        exam_session: 'Summer 2026'
      });
    expect(createRes.status).toBe(201);
    const profileId = createRes.body.profile.id;

    // User B cannot see user A's profile.
    const forbidden = await request(app).get(`/api/profiles/${profileId}`).set('Cookie', cookieB);
    expect(forbidden.status).toBe(404); // not found rather than leaking existence via 403
  });

  test('non-admin users are blocked from admin routes', async () => {
    const cookie = await registerAndLogin('regular@example.com');
    const res = await request(app).get('/api/admin/dashboard').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  test('admin users can access admin routes', async () => {
    const bcrypt = require('bcryptjs');
    db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@test.com', ?, 'admin')`).run(
      bcrypt.hashSync('AdminPass123', 12)
    );
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'AdminPass123' });
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app).get('/api/admin/dashboard').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
  });
});
