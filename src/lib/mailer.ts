import { fetch as undiciFetch, ProxyAgent } from "undici";
import type { Locale } from "@/lib/locale";

export type SendResult = { sent: boolean; reason?: string; id?: string };

function getProxyDispatcher() {
  const proxyUrl = (
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy ??
    ""
  ).trim();
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

/**
 * Sends the "your plan is saved" email via Resend.
 *
 * Graceful degradation: if RESEND_API_KEY / EMAIL_FROM are not configured, this
 * is a no-op and returns { sent: false }. The caller must not fail the request
 * when email sending is unavailable - capture is the primary goal, delivery is
 * best-effort.
 */
export async function sendPlanReadyEmail(
  to: string,
  options: { sessionId: string; locale: Locale }
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { sent: false, reason: "email_not_configured" };
  }

  const appUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const link = `${appUrl}/?session=${encodeURIComponent(options.sessionId)}`;
  const isZh = options.locale === "zh";
  const subject = isZh ? "你的健康计划已保存" : "Your health plan is saved";
  const html = isZh
    ? `<p>你的个性化健康计划已经保存。</p><p><a href="${link}">点此查看你的计划</a></p><p>本邮件仅为健身训练建议,不构成医疗诊断。</p>`
    : `<p>Your personalized health plan is saved.</p><p><a href="${link}">Open your plan</a></p><p>This is educational fitness guidance, not medical advice.</p>`;

  try {
    const response = await undiciFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html }),
      dispatcher: getProxyDispatcher()
    });
    if (!response.ok) {
      return { sent: false, reason: `resend_status_${response.status}` };
    }
    const data = (await response.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : "send_failed" };
  }
}
