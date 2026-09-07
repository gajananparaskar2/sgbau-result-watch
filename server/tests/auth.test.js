process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test-auth.sqlite';
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

describe('Auth API', () => {
  const creds = { name: 'Jane Doe', email: 'jane@example.com', password: 'Password123', confirmPassword: 'Password123' };

  test('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(creds.email);
  });

  test('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: creds.email, password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  test('blocks unauthorized access to protected routes', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(401);
  });

  test('allows access to protected routes with a valid session cookie', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    const cookie = loginRes.headers['set-cookie'];
    const res = await request(app).get('/api/profiles').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.profiles).toEqual([]);
  });
});
