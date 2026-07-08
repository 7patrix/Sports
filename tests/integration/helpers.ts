const placeholderUrl = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export const dbConfigured =
  Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== placeholderUrl;

// The /complete flow enqueues a report job on Redis (BullMQ). Tests that hit it
// require both a DB and a reachable Redis (docker compose brings both up).
export const redisConfigured = Boolean(process.env.REDIS_URL);

export function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function makeParams(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
