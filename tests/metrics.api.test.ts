import request from 'supertest';
import { describe, it, expect } from 'vitest';

const BASE = process.env.API_BASE || 'http://localhost:3001';

describe('Observability: /metrics', () => {
  it('exposes Prometheus metrics in text format', async () => {
    const res = await request(BASE).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text || '').toContain('http_requests_total');
    expect(res.text || '').toContain('http_request_duration_ms');
    expect(res.text || '').toContain('slo_violations_total');
  });
});