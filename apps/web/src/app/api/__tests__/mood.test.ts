import { describe, it, expect, vi, beforeEach } from "vitest";

const requirePatient = vi.fn();
const create = vi.fn();
const findMany = vi.fn();
vi.mock("@/lib/patient", () => ({ requirePatient }));
vi.mock("@exhale/db", () => ({ prisma: { moodEntry: { create, findMany } } }));
import { json } from "@/lib/http";

function post(body: unknown) {
  return new Request("http://t/api/mood", { method: "POST", body: JSON.stringify(body) });
}

describe("/api/mood", () => {
  beforeEach(() => { vi.resetModules(); requirePatient.mockReset(); create.mockReset(); findMany.mockReset(); });

  it("GET 401/403 propagates the requirePatient response", async () => {
    requirePatient.mockResolvedValue({ ok: false, response: json({ error: "Unauthorized" }, 401) });
    const { GET } = await import("../mood/route");
    expect((await GET(new Request("http://t/api/mood"))).status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("GET 200 returns the patient's entries newest-first", async () => {
    requirePatient.mockResolvedValue({ ok: true, patientId: "pp-1" });
    findMany.mockResolvedValue([{ id: "m1", moodScore: 7 }]);
    const { GET } = await import("../mood/route");
    const res = await GET(new Request("http://t/api/mood"));
    expect(res.status).toBe(200);
    expect((await res.json()).data[0].id).toBe("m1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "pp-1" }, orderBy: { createdAt: "desc" } }),
    );
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
