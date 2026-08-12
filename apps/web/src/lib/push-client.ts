export type PushPlatform = "web" | "ios" | "android";

async function send<T>(method: "POST" | "DELETE", body: unknown): Promise<T> {
  const res = await fetch("/api/push/tokens", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} /api/push/tokens failed: ${res.status}`);
  return (await res.json()).data as T;
}

export const registerPushToken = (token: string, platform: PushPlatform = "web") =>
  send<{ token: string; platform: PushPlatform }>("POST", { token, platform });

export const removePushToken = (token: string) => send<{ deleted: number }>("DELETE", { token });
