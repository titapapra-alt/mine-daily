type LoginAttempt = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 30 * 60 * 1000;
const MAX_FAILURES = 5;

const globalStore = globalThis as typeof globalThis & {
  loginAttemptStore?: Map<string, LoginAttempt>;
};

const attempts = globalStore.loginAttemptStore ?? new Map<string, LoginAttempt>();
globalStore.loginAttemptStore = attempts;

export function canAttemptLogin(key: string) {
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt) return true;
  if (attempt.blockedUntil > now) return false;
  if (now - attempt.windowStartedAt >= WINDOW_MS) attempts.delete(key);
  return true;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  const attempt = !current || now - current.windowStartedAt >= WINDOW_MS
    ? { failures: 0, windowStartedAt: now, blockedUntil: 0 }
    : current;

  attempt.failures += 1;
  if (attempt.failures >= MAX_FAILURES) attempt.blockedUntil = now + BLOCK_MS;
  attempts.set(key, attempt);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
