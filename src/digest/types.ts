export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightRead = {
  rows: DigestRow[];
  badLines: number;
};

/** `readNight(runsDir, night)` — missing file → null. */
export type ReadNight = (runsDir: string, night: string) => NightRead | null;
