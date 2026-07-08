import { fetch as undiciFetch, ProxyAgent } from "undici";
import {
  coachNarrativeSchema,
  reviewVerdictSchema,
  type CoachNarrative,
  type ReviewVerdict,
  type ScoredProfile
} from "@/lib/contracts";
import type { Locale } from "@/lib/locale";

type ChatMessage = { role: "system" | "user"; content: string };

/**
 * If a proxy is configured (HTTPS_PROXY / HTTP_PROXY / ALL_PROXY), route the
 * request through it. Needed in networks that cannot reach the model endpoint
 * directly. Returns undefined when no proxy is set.
 */
function getProxyDispatcher() {
  const proxyUrl = (
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    process.env.ALL_PROXY ??
    process.env.all_proxy ??
    ""
  ).trim();
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

/**
 * Reads AI config from process.env directly (not the strict env schema) so that
 * pure-logic tests do not need a full runtime env. The real API key/URL are
 * supplied at runtime via environment variables.
 */
function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const mock = (process.env.MOCK_AI ?? "true") === "true";
  return { apiKey, baseUrl, model, mock };
}

export function isAiWriterEnabled() {
  const { apiKey, mock } = getAiConfig();
  return Boolean(apiKey) && !mock;
}

type NarrativeInput = {
  profile: ScoredProfile;
  daysPerWeek: number;
  focus: string;
};

/**
 * Shared low-level call to an OpenAI-compatible chat endpoint that expects a
 * JSON object back. Returns the parsed JSON (unknown) or null on any failure.
 */
const MAX_ATTEMPTS = 2;

function isRetriableStatus(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}

async function callChatOnce(
  messages: ChatMessage[],
  temperature: number,
  config: { apiKey: string; baseUrl: string; model: string }
): Promise<{ ok: true; json: unknown } | { ok: false; retriable: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const dispatcher = getProxyDispatcher();

  try {
    const response = await undiciFetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature,
        response_format: { type: "json_object" },
        messages
      }),
      signal: controller.signal,
      dispatcher
    });

    if (!response.ok) {
      return { ok: false, retriable: isRetriableStatus(response.status) };
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, retriable: false };

    return { ok: true, json: JSON.parse(content) as unknown };
  } catch {
    // Network error / timeout / malformed JSON: treat as retriable transient failure.
    return { ok: false, retriable: true };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Shared low-level call to an OpenAI-compatible chat endpoint that expects a
 * JSON object back. Retries once on transient failures (429/5xx/network) with a
 * short backoff. Returns the parsed JSON (unknown) or null on any final failure.
 */
async function callChatJson(messages: ChatMessage[], temperature: number): Promise<unknown | null> {
  const { apiKey, baseUrl, model, mock } = getAiConfig();
  if (!apiKey || mock) return null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const outcome = await callChatOnce(messages, temperature, { apiKey, baseUrl, model });
    if (outcome.ok) return outcome.json;
    if (!outcome.retriable || attempt === MAX_ATTEMPTS) return null;
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  return null;
}

function buildProfileContext(input: NarrativeInput) {
  return {
    goal: input.profile.signals.primaryGoal,
    goalFeeling: input.profile.signals.goalFeeling,
    weeklySessions: input.profile.planConstraints.weeklySessions,
    sessionMinutes: input.profile.planConstraints.sessionMinutes,
    maxImpact: input.profile.planConstraints.maxImpact,
    focus: input.focus,
    daysPerWeek: input.daysPerWeek,
    scores: input.profile.scores,
    constraints: input.profile.signals.constraints,
    avoid: input.profile.planConstraints.avoid
  };
}

/**
 * Writer agent. Produces motivating, non-medical narrative copy. When
 * `revisionIssues` is provided, it rewrites the copy to fix those issues
 * (used by the reflection loop). Exercises are never generated here.
 */
export async function generateCoachNarrative(
  input: NarrativeInput,
  locale: Locale,
  revisionIssues?: string[]
): Promise<CoachNarrative | null> {
  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const system =
    "You are a certified Pilates coach writing encouraging, practical guidance. " +
    "You never give medical diagnosis or treatment claims. Respect the user's safety constraints " +
    "and never recommend movements in the 'avoid' list or that stress a listed limitation. " +
    "Respond ONLY with a compact JSON object of the form " +
    '{"summary": string, "coachNote": string}. ' +
    `Write both fields in ${language}. Keep each under 90 words.`;

  const context = buildProfileContext(input);
  const userPayload: Record<string, unknown> = { profile: context };
  if (revisionIssues && revisionIssues.length > 0) {
    userPayload.revisionRequired = true;
    userPayload.fixTheseIssues = revisionIssues;
  }

  const json = await callChatJson(
    [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(userPayload) }
    ],
    0.5
  );
  if (json === null) return null;

  const parsed = coachNarrativeSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Independent safety reviewer agent. Judges the writer's narrative against the
 * user's constraints and medical-safety rules. Returns a structured verdict, or
 * null if the reviewer could not be reached (caller decides how to handle).
 */
export async function reviewCoachNarrative(
  input: NarrativeInput,
  narrative: CoachNarrative,
  locale: Locale
): Promise<ReviewVerdict | null> {
  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const system =
    "You are a strict fitness safety reviewer. Given a user's constraints and a coach's narrative, " +
    "decide if the narrative is safe and appropriate. Reject if it: makes medical diagnosis/treatment claims, " +
    "promises guaranteed outcomes, recommends movements that stress a listed limitation or appear in 'avoid', " +
    "or contradicts the low-impact requirement. " +
    'Respond ONLY with JSON of the form {"approved": boolean, "issues": string[]}. ' +
    `Write issues in ${language}. Keep each issue short and actionable.`;

  const context = buildProfileContext(input);
  const json = await callChatJson(
    [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify({ profile: context, narrative }) }
    ],
    0
  );
  if (json === null) return null;

  const parsed = reviewVerdictSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
