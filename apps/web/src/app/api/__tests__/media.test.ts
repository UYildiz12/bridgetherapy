import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUser = vi.fn();
const mediaFindUnique = vi.fn();
const mediaCreate = vi.fn();
const userFindUnique = vi.fn();
const linkFindUnique = vi.fn();
const noteFindFirst = vi.fn();
const assignmentFindMany = vi.fn();
const signedMediaUrl = vi.fn();
const uploadMedia = vi.fn();
const rateCheck = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@/lib/storage", () => ({ signedMediaUrl, uploadMedia }));
vi.mock("@/lib/rate-limit", () => ({ createRateLimiter: () => ({ check: rateCheck }) }));
vi.mock("@exhale/db", () => ({
  prisma: {
    media: { findUnique: mediaFindUnique, create: mediaCreate },
    user: { findUnique: userFindUnique },
    patientTherapist: { findUnique: linkFindUnique },
    patientNote: { findFirst: noteFindFirst },
    homeworkAssignment: { findMany: assignmentFindMany },
  },
}));

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
function getReq(id: string) {
  return new Request(`http://t/api/media/${id}`);
}

/** Requester "t-user" is an approved therapist; uploader "p-user" is patient pp1. */
function mockTherapistAndPatientUsers() {
  userFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    where.id === "t-user"
      ? { therapistProfile: { id: "tp1", approvedAt: new Date("2026-01-01T00:00:00.000Z") } }
      : { patientProfile: { id: "pp1" } },
  );
}

describe("/api/media/[id] GET", () => {
  beforeEach(() => {
    vi.resetModules();
    [
      getAuthUser,
      mediaFindUnique,
      userFindUnique,
      linkFindUnique,
      noteFindFirst,
      assignmentFindMany,
      signedMediaUrl,
      rateCheck,
    ].forEach((f) => f.mockReset());
    rateCheck.mockReturnValue({ allowed: true, remaining: 1, retryAfterMs: 0 });
    signedMediaUrl.mockResolvedValue("https://files.example/signed/p-user/m1.webm");
  });

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { GET } = await import("../media/[id]/route");
    expect((await GET(getReq("m1"), ctx("m1"))).status).toBe(401);
  });

  it("429 when the download limiter blocks the user", async () => {
    getAuthUser.mockResolvedValue({ authId: "p-user" });
    rateCheck.mockReturnValue({ allowed: false, remaining: 0, retryAfterMs: 5_000 });
    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));
    expect(res.status).toBe(429);
    expect(mediaFindUnique).not.toHaveBeenCalled();
  });

  it("404 when the media does not exist", async () => {
    getAuthUser.mockResolvedValue({ authId: "p-user" });
    mediaFindUnique.mockResolvedValue(null);
    const { GET } = await import("../media/[id]/route");
    expect((await GET(getReq("m1"), ctx("m1"))).status).toBe(404);
  });

  it("redirects the uploader to a signed URL", async () => {
    getAuthUser.mockResolvedValue({ authId: "p-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://files.example/signed/p-user/m1.webm");
    // Owner access never consults the therapist ACL.
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("403s a linked therapist when the media is only referenced by a PRIVATE note", async () => {
    getAuthUser.mockResolvedValue({ authId: "t-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    mockTherapistAndPatientUsers();
    linkFindUnique.mockResolvedValue({ isActive: true });
    noteFindFirst.mockResolvedValue(null); // no SHARED note references it
    assignmentFindMany.mockResolvedValue([]); // and no homework for this therapist does

    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));

    expect(res.status).toBe(403);
    expect(noteFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1", voiceMediaId: "m1", visibility: "SHARED" },
      }),
    );
  });

  it("allows a linked therapist when a SHARED note references the media", async () => {
    getAuthUser.mockResolvedValue({ authId: "t-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    mockTherapistAndPatientUsers();
    linkFindUnique.mockResolvedValue({ isActive: true });
    noteFindFirst.mockResolvedValue({ id: "n1" });

    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));

    expect(res.status).toBe(302);
    expect(assignmentFindMany).not.toHaveBeenCalled();
  });

  it("allows a linked therapist when their homework's response references the media", async () => {
    getAuthUser.mockResolvedValue({ authId: "t-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    mockTherapistAndPatientUsers();
    linkFindUnique.mockResolvedValue({ isActive: true });
    noteFindFirst.mockResolvedValue(null);
    assignmentFindMany.mockResolvedValue([
      { response: { items: { voice1: { mediaId: "m1" } } } },
    ]);

    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));

    expect(res.status).toBe(302);
    expect(assignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId: "pp1", homework: { createdById: "tp1" } },
      }),
    );
  });

  it("does not match a media id that only appears as a substring", async () => {
    getAuthUser.mockResolvedValue({ authId: "t-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    mockTherapistAndPatientUsers();
    linkFindUnique.mockResolvedValue({ isActive: true });
    noteFindFirst.mockResolvedValue(null);
    assignmentFindMany.mockResolvedValue([
      { response: { items: { voice1: { mediaId: "m1-but-longer" } } } },
    ]);

    const { GET } = await import("../media/[id]/route");
    expect((await GET(getReq("m1"), ctx("m1"))).status).toBe(403);
  });

  it("403s a therapist with no active link even for shared material", async () => {
    getAuthUser.mockResolvedValue({ authId: "t-user" });
    mediaFindUnique.mockResolvedValue({ s3Key: "p-user/m1.webm", uploaderId: "p-user" });
    mockTherapistAndPatientUsers();
    linkFindUnique.mockResolvedValue({ isActive: false });

    const { GET } = await import("../media/[id]/route");
    const res = await GET(getReq("m1"), ctx("m1"));

    expect(res.status).toBe(403);
    expect(noteFindFirst).not.toHaveBeenCalled();
    expect(assignmentFindMany).not.toHaveBeenCalled();
  });
});

describe("/api/media POST (upload)", () => {
  beforeEach(() => {
    vi.resetModules();
    [getAuthUser, mediaCreate, uploadMedia, rateCheck].forEach((f) => f.mockReset());
    rateCheck.mockReturnValue({ allowed: true, remaining: 1, retryAfterMs: 0 });
  });

  function uploadReq() {
    const form = new FormData();
    form.append("kind", "voice");
    form.append("file", new Blob([new Uint8Array(16)], { type: "audio/webm" }), "voice.webm");
    return new Request("http://t/api/media", { method: "POST", body: form });
  }

  it("401 when unauthenticated", async () => {
    getAuthUser.mockResolvedValue(null);
    const { POST } = await import("../media/route");
    expect((await POST(uploadReq())).status).toBe(401);
  });

  it("429 when the upload limiter blocks the user", async () => {
    getAuthUser.mockResolvedValue({ authId: "p-user" });
    rateCheck.mockReturnValue({ allowed: false, remaining: 0, retryAfterMs: 30_000 });
    const { POST } = await import("../media/route");
    const res = await POST(uploadReq());
    expect(res.status).toBe(429);
    expect(uploadMedia).not.toHaveBeenCalled();
    expect(mediaCreate).not.toHaveBeenCalled();
  });

  it("stores the file and creates the media row for the uploader", async () => {
    getAuthUser.mockResolvedValue({ authId: "p-user" });
    uploadMedia.mockResolvedValue(undefined);
    mediaCreate.mockResolvedValue({ id: "m1" });

    const { POST } = await import("../media/route");
    const res = await POST(uploadReq());

    expect(res.status).toBe(201);
    expect(uploadMedia).toHaveBeenCalled();
    expect(mediaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploaderId: "p-user", type: "VOICE_NOTE" }),
      }),
    );
    expect((await res.json()).data.mediaId).toBe("m1");
  });
});
