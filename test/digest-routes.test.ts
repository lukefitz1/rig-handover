import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWithRuns(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

describe('digest routes', () => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));

  writeFileSync(
    join(runsDir, '2026-10-28.jsonl'),
    [
      '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
      'not-json',
      '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      '',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, 'empty-night.jsonl'), '');

  const app = appWithRuns(runsDir);

  it('GET /digest/:night returns 200 with jobs', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('rig/rotate-logs');
  });

  it('GET /api/digest/:night returns the same jobs in the same order', async () => {
    const page = await (await app.request('/digest/2026-10-28')).text();
    const json = await (await app.request('/api/digest/2026-10-28')).json();
    expect(json.badLines).toBe(1);
    expect(json.rows.map((r: { job: string }) => r.job)).toEqual(['lane/sync', 'rig/rotate-logs']);
    const jobOrder = json.rows.map((r: { job: string }) => r.job);
    let lastIdx = -1;
    for (const job of jobOrder) {
      const idx = page.indexOf(job);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it('returns 404 for a night with no file', async () => {
    expect((await app.request('/digest/1999-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/1999-01-01')).status).toBe(404);
  });

  it('renders nothing ran for an empty night', async () => {
    const res = await app.request('/digest/empty-night');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('still renders a night that has a bad line', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const json = await (await app.request('/api/digest/2026-10-28')).json();
    expect(json.badLines).toBe(1);
    expect(json.rows).toHaveLength(2);
  });
});
