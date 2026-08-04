const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/db/prismaClient');

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/register', () => {
  test('creates a new user and returns a token', async () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    const response = await request(app).post('/auth/register').send({
      email: uniqueEmail,
      password: 'Test1234!',
      name: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(uniqueEmail);
    expect(response.body.data.user.role).toBe('USER');
    expect(response.body.data.user.password).toBeUndefined();
    expect(typeof response.body.data.accessToken).toBe('string');
  });

  test('rejects a duplicate email with 409', async () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await request(app).post('/auth/register').send({
      email: uniqueEmail,
      password: 'Test1234!',
      name: 'Test User',
    });

    const response = await request(app).post('/auth/register').send({
      email: uniqueEmail,
      password: 'Test1234!',
      name: 'Test User',
    });

    expect(response.status).toBe(409);
  });

  test('rejects a short password with 400', async () => {
    const response = await request(app).post('/auth/register').send({
      email: `test-${Date.now()}@example.com`,
      password: '123',
      name: 'Test User',
    });

    expect(response.status).toBe(400);
  });
});