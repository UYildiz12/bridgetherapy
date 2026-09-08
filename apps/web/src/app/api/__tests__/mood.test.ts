import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
const count = vi.fn();
vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@bridge/db", () => ({ prisma: { moodEntry: { create, findMany, count } } }));
import { json } from "@/lib/http";

function post(body: unknown) {
  return new Request("http://t/api/mood", { method: "POST", body: JSON.stringify(body) });
}

describe("/api/mood", () => {
  beforeEach(() => { vi.resetModules(); requirePatient.mockReset(); create.mockReset(); findMany.mockReset(); count.mockReset(); });

  it("GET 401/403 propagates the requirePatient response", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { GET } = await import("../mood/route");
    expect((await GET(new Request("http://t/api/mood"))).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("GET 200 returns the patient's entries newest-first with the all-time total", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    findMany.mockResolvedValue([{ id: "m1", moodScore: 7 }]);
    count.mockResolvedValue(150);
    const { GET } = await import("../mood/route");
    const res = await GET(new Request("http://t/api/mood"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].id).toBe("m1");
    // The list is capped at 100, so the real count rides alongside it.
    expect(body.total).toBe(150);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "pp-1" }, orderBy: { createdAt: "desc" } }),
    );
    expect(count).toHaveBeenCalledWith({ where: { patientId: "pp-1" } });
  });

  it("POST 400 on an out-of-range moodScore", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    const { POST } = await import("../mood/route");
    expect((await POST(post({ moodScore: 11 }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("POST 201 creates an entry for the patient", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    create.mockResolvedValue({ id: "m2", moodScore: 5, tags: ["tired"] });
    const { POST } = await import("../mood/route");
    const res = await POST(post({ moodScore: 5, notes: "ok", tags: ["tired"] }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patientId: "pp-1", moodScore: 5, tags: ["tired"] }) }),
    );
  });
});
