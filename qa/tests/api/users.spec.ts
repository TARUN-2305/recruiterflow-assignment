import { test, expect } from '@playwright/test';

test.describe('ReqRes users API', () => {
  // The key is sent as the x-api-key header (see playwright.config.ts).
  // Without it we skip with a clear reason instead of failing with a confusing 401.
  test.skip(!process.env.REQRES_API_KEY, 'REQRES_API_KEY is not set: copy .env.example to .env and add your key');

  test('GET /api/users/2 returns 200 and the user has an email', async ({ request }) => {
    const response = await request.get('/api/users/2');

    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ data: { email: expect.stringContaining('@') } });
  });

  test('POST /api/users creates a user and returns 201 with the name', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { name: 'morpheus', job: 'leader' },
    });

    expect(response.status()).toBe(201);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ name: 'morpheus' });
  });

  test('GET /api/users/23 returns 404 for a user that does not exist', { tag: '@bonus' }, async ({ request }) => {
    const response = await request.get('/api/users/23');

    expect(response.status()).toBe(404);
  });
});
