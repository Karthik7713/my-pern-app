const request = require('supertest');
const app = require('../src/app');

describe('Reports routes (smoke)', () => {
  test('GET /api/ping returns ok', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', 1);
  });

  test('GET /api/dashboard/summary without token returns 401 with error field', async () => {
    const res = await request(app).get('/api/dashboard/summary?limit=1');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
