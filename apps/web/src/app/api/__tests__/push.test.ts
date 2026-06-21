import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const tokenUpsert = vi.fn();
const tokenDeleteMany = vi.fn();
const homeworkFindMany = vi.fn();
const sessionFindMany = vi.fn();
const deliverPushNotification = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@/lib/push", () => ({ deliverPushNotification }));
vi.mock("@exhale/db", () => ({
  prisma: {
    pushToken: { upsert: tokenUpsert, deleteMany: tokenDeleteMany },
    homeworkAssignment: { findMany: homeworkFindMany },
    session: { findMany: sessionFindMany },
  },
}));

function req(url: string, body?: unknown, headers?: Record<string, string>, method = body ? "POST" : "GET") {
  return new Request(`http://t${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/push/tokens", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, tokenUpsert, tokenDeleteMany].forEach((f) => f.mockReset());
  });

  it("registers a token for the authenticated user", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    tokenUpsert.mockResolvedValue({ id: "pt1", token: "push-token", platform: "web" });

    const { POST } = await import("../push/tokens/route");
    const res = await POST(req("/api/push/tokens", { token: "push-token", platform: "web" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(tokenUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: "push-token" },
        create: { userId: "u1", token: "push-token", platform: "web" },
        update: { userId: "u1", platform: "web" },
      }),
    );
    expect(body.data.token).toBe("push-token");
  });

  it("removes only the current user's token", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    tokenDeleteMany.mockResolvedValue({ count: 1 });

    const { DELETE } = await import("../push/tokens/route");
    const res = await DELETE(req("/api/push/tokens", { token: "push-token" }, undefined, "DELETE"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(tokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "u1", token: "push-token" } });
    expect(body.data.deleted).toBe(1);
  });
});

describe("/api/cron/reminders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "secret");
    [homeworkFindMany, sessionFindMany, deliverPushNotification].forEach((f) => f.mockReset());
  });

  it("rejects requests without the cron bearer secret", async () => {
    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, {}));

    expect(res.status).toBe(401);
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it("sends due homework and upcoming session reminders", async () => {
    homeworkFindMany.mockResolvedValue([
      {
        id: "ha1",
        dueDate: new Date("2026-06-22T00:00:00.000Z"),
        homework: { title: "Thought record" },
        patient: { user: { id: "u-patient", pushTokens: [{ token: "tok1", platform: "web" }] } },
      },
    ]);
    sessionFindMany.mockResolvedValue([
      {
        id: "s1",
        scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
        patient: { user: { id: "u-patient", pushTokens: [{ token: "tok1", platform: "web" }] } },
      },
    ]);
    deliverPushNotification.mockResolvedValue({ delivered: true });

    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(deliverPushNotification).toHaveBeenCalledTimes(2);
    expect(deliverPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "tok1",
        title: "Homework due soon",
      }),
    );
    expect(body.data.attempted).toBe(2);
  });
});
