const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;
const MAX_RESETS_PER_WINDOW = 3;

type ResetAttempt = {
  count: number;
  windowStartedAt: number;
  lastRequestedAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  passwordResetAttemptStore?: Map<string, ResetAttempt>;
};

const attempts = globalStore.passwordResetAttemptStore ?? new Map<string, ResetAttempt>();
globalStore.passwordResetAttemptStore = attempts;

export function canRequestPasswordReset(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.windowStartedAt >= RESET_WINDOW_MS) return true;
  return current.count < MAX_RESETS_PER_WINDOW && now - current.lastRequestedAt >= RESET_COOLDOWN_MS;
}

export function recordPasswordResetRequest(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  attempts.set(key, !current || now - current.windowStartedAt >= RESET_WINDOW_MS
    ? { count: 1, windowStartedAt: now, lastRequestedAt: now }
    : { ...current, count: current.count + 1, lastRequestedAt: now });
}
