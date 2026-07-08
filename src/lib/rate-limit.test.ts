import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit within the window", () => {
    const key = `t-${Math.random()}`;
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit and reports retry-after", () => {
    const key = `t-${Math.random()}`;
    checkRateLimit(key, 2, 10_000);
    checkRateLimit(key, 2, 10_000);
    const blocked = checkRateLimit(key, 2, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", async () => {
    const key = `t-${Math.random()}`;
    expect(checkRateLimit(key, 1, 20).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 20).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkRateLimit(key, 1, 20).allowed).toBe(true);
  });

  it("keeps separate counters per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(checkRateLimit(a, 1, 1000).allowed).toBe(true);
    expect(checkRateLimit(a, 1, 1000).allowed).toBe(false);
    expect(checkRateLimit(b, 1, 1000).allowed).toBe(true);
  });
});
