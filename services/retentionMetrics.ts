let lastRunAt: Date | null = null;
let lastProcessed: number = 0;
let lastError: string | null = null;
let totalRuns: number = 0;

export function recordRetentionSuccess(processed: number, when: Date = new Date()) {
  lastRunAt = when;
  lastProcessed = processed;
  lastError = null;
  totalRuns += 1;
}

export function recordRetentionFailure(error: string, when: Date = new Date()) {
  lastRunAt = when;
  lastError = error;
  totalRuns += 1;
}

export function getRetentionStatus() {
  const intervalMinutes = Number(process.env.RETENTION_INTERVAL_MINUTES || 30);
  const schedulerEnabled = process.env.NODE_ENV !== 'test';
  return {
    lastRunAt,
    lastProcessed,
    lastError,
    totalRuns,
    intervalMinutes,
    schedulerEnabled,
  };
}
