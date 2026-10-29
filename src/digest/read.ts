import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightRead, ReadNight } from './types.js';

const STATUSES = new Set<JobStatus>(['ok', 'retry', 'fail']);

type LogLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

function parseLine(line: string): LogLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.has(o.status as JobStatus)) return null;
  if (!(o.owner === null || typeof o.owner === 'string')) return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as JobStatus,
    owner: o.owner,
    error: typeof o.error === 'string' ? o.error : undefined,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;

  const text = readFileSync(path, 'utf8');
  const lines = text.length === 0 ? [] : text.split('\n');

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    if (line.trim() === '') continue;
    const parsed = parseLine(line);
    if (!parsed) {
      badLines += 1;
      continue;
    }

    const existing = byJob.get(parsed.job);
    if (!existing) {
      byJob.set(parsed.job, {
        job: parsed.job,
        owner: parsed.owner,
        runs: 1,
        retries: parsed.status === 'retry' ? 1 : 0,
        lastStatus: parsed.status,
        lastError: parsed.error ?? null,
        firstAt: parsed.at,
        lastAt: parsed.at,
      });
      continue;
    }

    existing.runs += 1;
    if (parsed.status === 'retry') existing.retries += 1;
    existing.owner = parsed.owner;
    existing.lastStatus = parsed.status;
    existing.lastError = parsed.error ?? null;
    existing.lastAt = parsed.at;
  }

  return { rows: [...byJob.values()], badLines };
};
