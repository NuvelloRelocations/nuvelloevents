import { DurableObject } from "cloudflare:workers";

// Strict fixed-window counter. One object per (hashed) key, so every request for the same
// IP address or email address is counted in one place, worldwide. It stores only a count and
// a start time, and deletes both when the window ends.
export class RsvpLimiter extends DurableObject {
  async hit(limit, windowMs) {
    const now = Date.now();
    let start = (await this.ctx.storage.get("start")) ?? 0;
    let count = (await this.ctx.storage.get("count")) ?? 0;
    if (now - start >= windowMs) {
      start = now;
      count = 0;
      await this.ctx.storage.setAlarm(now + windowMs);
    }
    if (count >= limit) return false;
    await this.ctx.storage.put({ start, count: count + 1 });
    return true;
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

// Returns true while `key` is under `limit` uses per window. The key is hashed so no raw
// IP or email address is used as an object name.
export async function underLimit(env, key, limit, windowMs) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const name = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return env.LIMITER.get(env.LIMITER.idFromName(name)).hit(limit, windowMs);
}
