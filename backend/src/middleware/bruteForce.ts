import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockoutUntil: number | null;
}

// In-memory store for tracking failed login attempts
// Key: ip:username
const attemptStore = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function getKey(req: Request): string {
  const ip = getClientIp(req);
  const username = (req.body?.username || '').trim().toLowerCase();
  return `${ip}:${username || 'unknown'}`;
}

export function checkBruteForceLockout(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const record = attemptStore.get(key);
  const now = Date.now();

  if (record) {
    // If currently locked out
    if (record.lockoutUntil && now < record.lockoutUntil) {
      const remainingMs = record.lockoutUntil - now;
      const remainingMins = Math.ceil(remainingMs / (60 * 1000));

      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`,
      });
    }

    // Reset window if window expired without hitting lockout
    if (!record.lockoutUntil && now - record.firstAttempt > WINDOW_MS) {
      attemptStore.delete(key);
    }
  }

  next();
}

export function recordFailedLogin(req: Request): void {
  const key = getKey(req);
  const ip = getClientIp(req);
  const username = (req.body?.username || '').trim().toLowerCase();
  const now = Date.now();

  let record = attemptStore.get(key);

  if (!record || (!record.lockoutUntil && now - record.firstAttempt > WINDOW_MS)) {
    record = { count: 1, firstAttempt: now, lockoutUntil: null };
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + WINDOW_MS;
    console.warn(
      `[SECURITY WARNING] Brute-force lockout triggered! Username: '${username}' from IP: ${ip} failed ${record.count} times. Locked for 15 minutes.`
    );
  } else {
    console.warn(
      `[SECURITY AUDIT] Failed login attempt ${record.count}/${MAX_FAILED_ATTEMPTS} for Username: '${username}' from IP: ${ip}`
    );
  }

  attemptStore.set(key, record);
}

export function resetFailedLogin(req: Request): void {
  const key = getKey(req);
  attemptStore.delete(key);
}
