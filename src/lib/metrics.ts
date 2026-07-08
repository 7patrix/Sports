/**
 * Lightweight structured metrics emitter.
 *
 * Emits one JSON line per metric to stdout. This is intentionally dependency-free
 * so it works in both the Next.js runtime and the standalone worker. In a Datadog
 * setup these lines are picked up as logs and turned into log-based metrics (or
 * ingested via the Datadog Agent). Swapping this for dd-trace/StatsD later only
 * requires changing this one file.
 */
export type MetricTags = Record<string, string | number | boolean | undefined>;

export function recordMetric(name: string, value: number, tags: MetricTags = {}) {
  const cleanTags: MetricTags = {};
  for (const [key, val] of Object.entries(tags)) {
    if (val !== undefined) cleanTags[key] = val;
  }
  const line = {
    metric: name,
    value,
    tags: cleanTags,
    ts: new Date().toISOString()
  };
  // Single-line JSON so log processors (Datadog, etc.) can parse each event.
  console.log(`[metric] ${JSON.stringify(line)}`);
}

/** Convenience: time an async operation and emit a duration metric (ms). */
export async function measure<T>(name: string, tags: MetricTags, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    recordMetric(name, Date.now() - start, { ...tags, outcome: "success" });
    return result;
  } catch (error) {
    recordMetric(name, Date.now() - start, { ...tags, outcome: "error" });
    throw error;
  }
}
