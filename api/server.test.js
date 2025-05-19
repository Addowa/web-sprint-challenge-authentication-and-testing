const request = require('supertest');
const db = require('../data/dbconfig');
const server = require('./server');

beforeAll(async () => {
  await db.migrate.rollback();
  await db.migrate.latest();
});

beforeEach(async () => {
  await db('users').truncate();
});

afterAll(async () => {
  await db.destroy();
});

describe('Sanity check', () => {
  test('true is true', () => {
    expect(true).toBe(true);
  });
});

describe('[POST] /api/auth/register', () => {
  test('responds with new user and hashed password', async () => {
    const res = await request(server).post('/api/auth/register').send({
      username: 'user1',
      password: 'pass1'
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('username', 'user1');
    expect(res.body.password).not.toBe('pass1'); 
  });

  test('responds with "username taken" if username is reused', async () => {
    await request(server).post('/api/auth/register').send({
      username: 'user1',
      password: 'pass1'
    });
    const res = await request(server).post('/api/auth/register').send({
      username: 'user1',
      password: 'pass2'
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('username taken');
  });
});

describe('[POST] /api/auth/login', () => {
  test('returns a token and welcome message on success', async () => {
    await request(server).post('/api/auth/register').send({
      username: 'user2',
      password: 'pass2'
    });
    const res = await request(server).post('/api/auth/login').send({
      username: 'user2',
      password: 'pass2'
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/welcome, user2/i);
    expect(res.body).toHaveProperty('token');
  });

  test('responds with "invalid credentials" on bad password', async () => {
    await request(server).post('/api/auth/register').send({
      username: 'user3',
      password: 'pass3'
    });
    const res = await request(server).post('/api/auth/login').send({
      username: 'user3',
      password: 'wrongpass'
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('invalid credentials');
  });
});

describe('[GET] /api/jokes', () => {
  test('responds with "token required" if no auth header', async () => {
    const res = await request(server).get('/api/jokes');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('token required');
  });

  test('responds with jokes on valid token', async () => {
    await request(server).post('/api/auth/register').send({
      username: 'user4',
      password: 'pass4'
    });
    const login = await request(server).post('/api/auth/login').send({
      username: 'user4',
      password: 'pass4'
    });
    const token = login.body.token;

    const res = await request(server)
      .get('/api/jokes')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3); 
  });
});
