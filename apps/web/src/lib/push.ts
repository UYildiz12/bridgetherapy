export interface PushPayload {
  token: string;
  platform: string;
  title: string;
  body: string;
  url?: string;
}

export interface PushDeliveryResult {
  delivered: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

const DELIVERY_TIMEOUT_MS = 10_000;

/**
 * Best-effort webhook delivery. Never throws: reminder crons fan out over many
 * tokens, and one dead endpoint or hung socket must not abort the rest of the
 * batch, so failures come back as a result object instead of a rejection.
 */
export async function deliverPushNotification(payload: PushPayload): Promise<PushDeliveryResult> {
  const webhook = process.env.PUSH_WEBHOOK_URL;
  if (!webhook) return { delivered: false, skipped: true };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    return { delivered: res.ok, status: res.status };
  } catch (err) {
    return { delivered: false, error: err instanceof Error ? err.message : String(err) };
  }
}
