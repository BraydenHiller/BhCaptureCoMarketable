import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- module mocks ---- */

const mockGalleryFindFirst = vi.fn();
const mockDownloadEntitlementFindFirst = vi.fn();
const mockGetClientGallerySession = vi.fn();
const mockIsClientSessionValid = vi.fn();
const mockGenerateDownloadUrl = vi.fn();

vi.mock("@/lib/withTenantRequestScope", () => ({
  withTenantRequestScope: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/db/requestDb", () => ({
  getRequestDb: vi.fn(() => ({
    gallery: { findFirst: mockGalleryFindFirst },
    downloadEntitlement: { findFirst: mockDownloadEntitlementFindFirst },
  })),
}));

vi.mock("@/lib/requestScope", () => ({
  requireScopedTenantId: vi.fn(() => "t1"),
}));

vi.mock("@/lib/auth/clientGallerySession", () => ({
  getClientGallerySession: (...args: unknown[]) => mockGetClientGallerySession(...args),
}));

vi.mock("@/lib/galleryClientAuth", () => ({
  isClientSessionValid: (...args: unknown[]) => mockIsClientSessionValid(...args),
}));

vi.mock("@/lib/storage/s3", () => ({
  generateDownloadUrl: (...args: unknown[]) => mockGenerateDownloadUrl(...args),
}));

import { GET } from "./route";

/* ---- helpers ---- */

function makeParams(id: string, photoId: string) {
  return { params: Promise.resolve({ id, photoId }) };
}

function makeRequest() {
  return new NextRequest("http://localhost/api/p/galleries/g1/download/p1", {
    method: "GET",
  });
}

describe("GET /api/p/galleries/[id]/download/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session invalid", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(false);
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("returns 404 GALLERY_NOT_FOUND when gallery missing", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(true);
    mockGalleryFindFirst.mockResolvedValue(null);
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "GALLERY_NOT_FOUND" });
  });

  it("returns 400 CLIENT_USERNAME_REQUIRED when clientUsername null", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(true);
    mockGalleryFindFirst.mockResolvedValue({ id: "g1", clientUsername: null });
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "CLIENT_USERNAME_REQUIRED" });
  });

  it("returns 403 NOT_ENTITLED when no entitlement found", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(true);
    mockGalleryFindFirst.mockResolvedValue({ id: "g1", clientUsername: "client1" });
    mockDownloadEntitlementFindFirst.mockResolvedValue(null);
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "NOT_ENTITLED" });
  });

  it("returns 403 NOT_ENTITLED when entitlement exists but no photo.storageKey", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(true);
    mockGalleryFindFirst.mockResolvedValue({ id: "g1", clientUsername: "client1" });
    mockDownloadEntitlementFindFirst.mockResolvedValue({ photo: { storageKey: null } });
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "NOT_ENTITLED" });
  });

  it("returns 200 with { url } when entitlement and storageKey exist", async () => {
    mockGetClientGallerySession.mockResolvedValue({});
    mockIsClientSessionValid.mockReturnValue(true);
    mockGalleryFindFirst.mockResolvedValue({ id: "g1", clientUsername: "client1" });
    mockDownloadEntitlementFindFirst.mockResolvedValue({ photo: { storageKey: "key123" } });
    mockGenerateDownloadUrl.mockResolvedValue("https://signed-url");
    const req = makeRequest();
    const res = await GET(req, makeParams("g1", "p1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://signed-url" });
    expect(mockGenerateDownloadUrl).toHaveBeenCalledWith("key123");
  });
});
