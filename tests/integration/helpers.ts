const placeholderUrl = "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export const dbConfigured =
  Boolean(process.env.DATABASE_URL) && process.env.DATABASE_URL !== placeholderUrl;

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
