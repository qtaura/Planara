import request from 'supertest';
import { describe, it, expect } from 'vitest';

const BASE = process.env.API_BASE || 'http://localhost:3001';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

describe('Admin: backup endpoints', () => {
  it('rejects unauthorized backup trigger', async () => {
    const res = await request(BASE).post('/admin/backup');
    expect([401, 403]).toContain(res.status);
  });

  it('allows authorized backup trigger and smoke test when ADMIN_TOKEN is set', async () => {
    if (!ADMIN_TOKEN) {
      // Skip if ADMIN_TOKEN not configured in environment
      return;
    }
    const trigger = await request(BASE)
      .post('/admin/backup')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send();
    expect(trigger.status).toBe(200);
    const backupPath = trigger.body?.backupPath;
    expect(typeof backupPath).toBe('string');

    const smoke = await request(BASE)
      .post('/admin/backup/test')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ backupPath });
    expect(smoke.status).toBe(200);
    expect(!!smoke.body?.isValid).toBe(true);
  });
});