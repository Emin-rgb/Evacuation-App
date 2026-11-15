export const LOCK_AFTER_FAILURES = 5;
export const LOCK_MS = 5 * 60 * 1000;

export function isLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

export function secondsLeft(lockedUntil: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}

/** State to store after one more wrong password: lock on the Nth failure and restart the count. */
export function afterFailure(failedAttempts: number, now: Date = new Date()) {
  const next = failedAttempts + 1;
  if (next >= LOCK_AFTER_FAILURES) {
    return { failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) };
  }
  return { failedAttempts: next, lockedUntil: null as Date | null };
}
