import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- module mocks ---- */

const mockGalleryFindFirst = vi.fn();
const mockAddPhotoToSelection = vi.fn();
const mockRemovePhotoFromSelection = vi.fn();
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
	addPhotoToSelection: (...args: unknown[]) => mockAddPhotoToSelection(...args),
	removePhotoFromSelection: (...args: unknown[]) => mockRemovePhotoFromSelection(...args),
}));

import { POST, DELETE } from "./route";

/* ---- helpers ---- */

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeJsonRequest(
	method: string,
	body: unknown,
	url = "http://localhost/api/p/galleries/g1/selection/items",
) {
	return new NextRequest(url, {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

function makePlainRequest(method: string) {
	return new NextRequest("http://localhost/api/p/galleries/g1/selection/items", {
		method,
		headers: { "content-type": "text/plain" },
		body: "hello",
	});
}

const validGallery = { id: "g1", accessMode: "PRIVATE", clientUsername: "alice" };
const selectionResult = {
	id: "sel1",
	status: "DRAFT",
	submittedAt: null,
	items: [{ id: "i1", photoId: "p1", note: null }],
};

/* ---- POST tests ---- */

describe("POST /api/p/galleries/[id]/selection/items", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when session invalid", async () => {
		mockGetClientGallerySession.mockResolvedValue(null);
		mockIsClientSessionValid.mockReturnValue(false);

		const res = await POST(makeJsonRequest("POST", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(401);
	});

	it("returns 400 INVALID_BODY for non-json content type", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);

		const res = await POST(makePlainRequest("POST"), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 404 PHOTO_NOT_FOUND when db throws", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockAddPhotoToSelection.mockRejectedValue(new Error("Photo not found"));

		const res = await POST(makeJsonRequest("POST", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "PHOTO_NOT_FOUND" });
	});

	it("returns 409 SELECTION_SUBMITTED when db throws", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockAddPhotoToSelection.mockRejectedValue(new Error("Selection is submitted"));

		const res = await POST(makeJsonRequest("POST", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "SELECTION_SUBMITTED" });
	});

	it("returns 200 on success", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockAddPhotoToSelection.mockResolvedValue(selectionResult);

		const res = await POST(makeJsonRequest("POST", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.id).toBe("sel1");
		expect(data.items).toHaveLength(1);
	});
});

/* ---- DELETE tests ---- */

describe("DELETE /api/p/galleries/[id]/selection/items", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 404 PHOTO_NOT_FOUND when db throws", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockRemovePhotoFromSelection.mockRejectedValue(new Error("Photo not found"));

		const res = await DELETE(makeJsonRequest("DELETE", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "PHOTO_NOT_FOUND" });
	});

	it("returns 409 SELECTION_SUBMITTED when db throws", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockRemovePhotoFromSelection.mockRejectedValue(new Error("Selection is submitted"));

		const res = await DELETE(makeJsonRequest("DELETE", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "SELECTION_SUBMITTED" });
	});

	it("returns 200 on success", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockRemovePhotoFromSelection.mockResolvedValue(selectionResult);

		const res = await DELETE(makeJsonRequest("DELETE", { photoId: "p1" }), makeParams("g1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.id).toBe("sel1");
	});
});
