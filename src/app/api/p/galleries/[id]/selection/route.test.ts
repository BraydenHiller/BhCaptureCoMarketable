import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- module mocks ---- */

const mockGalleryFindFirst = vi.fn();
const mockGetSelectionWithItems = vi.fn();
const mockCreateOrGetDraftSelection = vi.fn();
const mockGetClientGallerySession = vi.fn();
const mockIsClientSessionValid = vi.fn();

vi.mock("@/lib/withTenantRequestScope", () => ({
	withTenantRequestScope: vi.fn((fn: (tenantId: string) => Promise<unknown>) => fn("t1")),
}));

vi.mock("@/db/requestDb", () => ({
	getRequestDb: vi.fn(() => ({
		gallery: { findFirst: mockGalleryFindFirst },
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

vi.mock("@/db/selection", () => ({
	getSelectionWithItems: (...args: unknown[]) => mockGetSelectionWithItems(...args),
	createOrGetDraftSelection: (...args: unknown[]) => mockCreateOrGetDraftSelection(...args),
}));

import { GET } from "./route";

/* ---- helpers ---- */

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeRequest(url = "http://localhost/api/p/galleries/g1/selection") {
	return new NextRequest(url, { method: "GET" });
}

const validGallery = { id: "g1", accessMode: "PRIVATE", clientUsername: "alice" };
const draftSelection = {
	id: "sel1",
	status: "DRAFT",
	submittedAt: null,
	items: [{ id: "i1", photoId: "p1", note: null }],
};

/* ---- tests ---- */

describe("GET /api/p/galleries/[id]/selection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when client session invalid", async () => {
		mockGetClientGallerySession.mockResolvedValue(null);
		mockIsClientSessionValid.mockReturnValue(false);

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
	});

	it("returns 404 when gallery missing", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(null);

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "GALLERY_NOT_FOUND" });
	});

	it("returns 400 when gallery not private", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue({ ...validGallery, accessMode: "PUBLIC" });

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "GALLERY_NOT_PRIVATE" });
	});

	it("returns 400 when clientUsername missing", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue({ ...validGallery, clientUsername: null });

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "CLIENT_USERNAME_REQUIRED" });
	});

	it("returns existing selection", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockGetSelectionWithItems.mockResolvedValue(draftSelection);

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.id).toBe("sel1");
		expect(data.status).toBe("DRAFT");
		expect(data.items).toHaveLength(1);
		expect(mockCreateOrGetDraftSelection).not.toHaveBeenCalled();
	});

	it("creates draft when getSelectionWithItems returns null", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockGetSelectionWithItems.mockResolvedValue(null);
		mockCreateOrGetDraftSelection.mockResolvedValue({ ...draftSelection, items: [] });

		const res = await GET(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(200);
		expect(mockCreateOrGetDraftSelection).toHaveBeenCalledWith("g1", "alice");
	});
});
