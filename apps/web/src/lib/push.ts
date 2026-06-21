export interface PushPayload {
  token: string;
  platform: string;
  title: string;
  body: string;
  url?: string;
}

export async function deliverPushNotification(payload: PushPayload) {
  const webhook = process.env.PUSH_WEBHOOK_URL;
  if (!webhook) return { delivered: false, skipped: true };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  return { delivered: res.ok, status: res.status };
}
