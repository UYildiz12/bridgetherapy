import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const tokenUpsert = vi.fn();
const tokenDeleteMany = vi.fn();
const tokenFindUnique = vi.fn();
const homeworkFindMany = vi.fn();
const sessionFindMany = vi.fn();
const deliverPushNotification = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@/lib/push", () => ({ deliverPushNotification }));
vi.mock("@bridge/db", () => ({
  prisma: {
    pushToken: { upsert: tokenUpsert, deleteMany: tokenDeleteMany, findUnique: tokenFindUnique },
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
    [getAuthUser, tokenUpsert, tokenDeleteMany, tokenFindUnique].forEach((f) => f.mockReset());
  });

  it("registers a token for the authenticated user", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    tokenFindUnique.mockResolvedValue(null);
    tokenUpsert.mockResolvedValue({ id: "pt1", token: "push-token", platform: "web" });

    const { POST } = await import("../push/tokens/route");
    const res = await POST(req("/api/push/tokens", { token: "push-token", platform: "web" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(tokenUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: "push-token" },
        create: { userId: "u1", token: "push-token", platform: "web" },
        update: { platform: "web" },
      }),
    );
    expect(body.data.token).toBe("push-token");
  });

  it("lets a user re-register their own token", async () => {
    getAuthUser.mockResolvedValue({ authId: "u1", email: "sam@example.com" });
    tokenFindUnique.mockResolvedValue({ userId: "u1" });
    tokenUpsert.mockResolvedValue({ id: "pt1", token: "push-token", platform: "ios" });

    const { POST } = await import("../push/tokens/route");
    const res = await POST(req("/api/push/tokens", { token: "push-token", platform: "ios" }));

    expect(res.status).toBe(201);
    expect(tokenUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { platform: "ios" } }),
    );
  });

  it("refuses to move a token registered to another user", async () => {
    getAuthUser.mockResolvedValue({ authId: "u2", email: "eve@example.com" });
    tokenFindUnique.mockResolvedValue({ userId: "u1" });

    const { POST } = await import("../push/tokens/route");
    const res = await POST(req("/api/push/tokens", { token: "push-token", platform: "web" }));

    expect(res.status).toBe(409);
    expect(tokenUpsert).not.toHaveBeenCalled();
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
  const onceDoc = { version: 2, schedule: { cadence: "once" }, blocks: [{ type: "text", id: "b1", body: "Read this." }] };
  const dailyDoc = { ...onceDoc, schedule: { cadence: "daily" } };

  function homeworkRow(overrides: { id?: string; notify?: boolean; token?: string; content?: unknown } = {}) {
    return {
      id: overrides.id ?? "ha1",
      dueDate: new Date("2026-06-22T00:00:00.000Z"),
      homework: { title: "Thought record", content: overrides.content ?? onceDoc },
      patient: {
        user: {
          id: "u-patient",
          notifyHomeworkNudges: overrides.notify ?? true,
          pushTokens: [{ token: overrides.token ?? "tok1", platform: "web" }],
        },
      },
    };
  }

  function sessionRow(overrides: { notify?: boolean; token?: string } = {}) {
    return {
      id: "s1",
      scheduledAt: new Date("2026-06-22T15:00:00.000Z"),
      patient: {
        user: {
          id: "u-patient",
          notifySessionReminders: overrides.notify ?? true,
          pushTokens: [{ token: overrides.token ?? "tok1", platform: "web" }],
        },
      },
    };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "secret");
    [homeworkFindMany, sessionFindMany, deliverPushNotification].forEach((f) => f.mockReset());
    homeworkFindMany.mockResolvedValue([]);
    sessionFindMany.mockResolvedValue([]);
    deliverPushNotification.mockResolvedValue({ delivered: true, status: 200 });
  });

  it("rejects requests without the cron bearer secret", async () => {
    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, {}));

    expect(res.status).toBe(401);
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong bearer secret", async () => {
    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer nope" }));

    expect(res.status).toBe(401);
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", undefined);

    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer secret" }));

    expect(res.status).toBe(401);
    expect(homeworkFindMany).not.toHaveBeenCalled();
  });

  it("sends due homework and upcoming session reminders", async () => {
    homeworkFindMany.mockResolvedValue([homeworkRow()]);
    sessionFindMany.mockResolvedValue([sessionRow()]);

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
    expect(body.data.delivered).toBe(2);
  });

  it("only queries recipients who opted in to each reminder type", async () => {
    const { POST } = await import("../cron/reminders/route");
    await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer secret" }));

    expect(homeworkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patient: { user: { notifyHomeworkNudges: true } } }),
      }),
    );
    expect(sessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patient: { user: { notifySessionReminders: true } } }),
      }),
    );
  });

  it("skips users who opted out of a reminder type", async () => {
    homeworkFindMany.mockResolvedValue([
      homeworkRow({ id: "ha-off", notify: false, token: "tok-off" }),
      homeworkRow({ id: "ha-on", notify: true, token: "tok-on", content: dailyDoc }),
    ]);
    sessionFindMany.mockResolvedValue([sessionRow({ notify: false, token: "tok-off" })]);

    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(deliverPushNotification).toHaveBeenCalledTimes(1);
    expect(deliverPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "tok-on",
        title: "Today's entry is waiting",
      }),
    );
    expect(body.data.attempted).toBe(1);
  });

  it("keeps delivering when one push delivery rejects", async () => {
    homeworkFindMany.mockResolvedValue([homeworkRow()]);
    sessionFindMany.mockResolvedValue([sessionRow()]);
    deliverPushNotification
      .mockRejectedValueOnce(new Error("push provider down"))
      .mockResolvedValueOnce({ delivered: true, status: 200 });

    const { POST } = await import("../cron/reminders/route");
    const res = await POST(req("/api/cron/reminders", undefined, { authorization: "Bearer secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.attempted).toBe(2);
    expect(body.data.delivered).toBe(1);
    expect(body.data.failed).toBe(1);
  });
});
