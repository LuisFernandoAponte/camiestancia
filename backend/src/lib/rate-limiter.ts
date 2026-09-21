import logger from "@/utils/logger.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const ONE_MINUTE_MS = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, ONE_MINUTE_MS);

export function rateLimit(key: string, maxAttempts: number, windowMs: number = ONE_MINUTE_MS): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    logger.warn(`Rate limit excedido para ${key}`);
    return false;
  }

  entry.count++;
  return true;
}

export function ipKey(c: any): string {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
  return `rl:${ip}`;
}
