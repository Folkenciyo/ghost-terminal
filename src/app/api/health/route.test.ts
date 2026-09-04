import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('answers 200 with an ok status', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('reports a non-negative uptime', async () => {
    const body = await GET().json();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
