import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- module mocks ---- */

const mockGalleryFindFirst = vi.fn();
const mockSubmitSelection = vi.fn();
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
	submitSelection: (...args: unknown[]) => mockSubmitSelection(...args),
}));

import { POST } from "./route";

/* ---- helpers ---- */

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeRequest(url = "http://localhost/api/p/galleries/g1/selection/submit") {
	return new NextRequest(url, { method: "POST" });
}

const validGallery = { id: "g1", accessMode: "PRIVATE", clientUsername: "alice" };
const submittedSelection = {
	id: "sel1",
	status: "SUBMITTED",
	submittedAt: new Date().toISOString(),
	items: [{ id: "i1", photoId: "p1", note: null }],
};

/* ---- tests ---- */

describe("POST /api/p/galleries/[id]/selection/submit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when session invalid", async () => {
		mockGetClientGallerySession.mockResolvedValue(null);
		mockIsClientSessionValid.mockReturnValue(false);

		const res = await POST(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(401);
	});

	it("returns 404 when gallery missing", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(null);

		const res = await POST(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "GALLERY_NOT_FOUND" });
	});

	it("returns 409 MAX_SELECTIONS_EXCEEDED", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockSubmitSelection.mockRejectedValue(new Error("Selection exceeds max selections"));

		const res = await POST(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "MAX_SELECTIONS_EXCEEDED" });
	});

	it("returns 409 SELECTION_SUBMITTED", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockSubmitSelection.mockRejectedValue(new Error("Selection is submitted"));

		const res = await POST(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "SELECTION_SUBMITTED" });
	});

	it("returns 200 on success", async () => {
		mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
		mockIsClientSessionValid.mockReturnValue(true);
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockSubmitSelection.mockResolvedValue(submittedSelection);

		const res = await POST(makeRequest(), makeParams("g1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.status).toBe("SUBMITTED");
		expect(data.items).toHaveLength(1);
	});
});
