import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ---- module mocks ---- */

const mockGalleryFindFirst = vi.fn();
const mockTenantFindUnique = vi.fn();
const mockCreatePendingPurchase = vi.fn();
const mockGetClientGallerySession = vi.fn();
const mockIsClientSessionValid = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();

vi.mock("@/lib/withTenantRequestScope", () => ({
	withTenantRequestScope: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/db/requestDb", () => ({
	getRequestDb: vi.fn(() => ({
		gallery: { findFirst: mockGalleryFindFirst },
		tenant: { findUnique: mockTenantFindUnique },
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

vi.mock("@/db/purchase", () => ({
	createPendingPurchase: (...args: unknown[]) => mockCreatePendingPurchase(...args),
}));

vi.mock("@/lib/stripe", () => ({
	getStripe: () => ({
		checkout: { sessions: { create: (...args: unknown[]) => mockCheckoutSessionsCreate(...args) } },
	}),
}));

vi.mock("@/lib/http/baseUrl", () => ({
	getRequestBaseUrl: () => "http://localhost",
}));

import { POST } from "./route";

/* ---- helpers ---- */

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeRequest(body?: unknown) {
	return new NextRequest("http://localhost/api/p/galleries/g1/purchase/checkout", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

function makeRequestNoContentType(body?: unknown) {
	return new NextRequest("http://localhost/api/p/galleries/g1/purchase/checkout", {
		method: "POST",
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

const validGallery = { id: "g1", clientUsername: "alice" };

const validPurchase = {
	id: "pur1",
	status: "PENDING",
	totalInCents: 800,
	platformFeeInCents: 0,
	items: [
		{ id: "pi1", photoId: "p1", priceInCents: 500, photo: { originalFilename: "sunset.jpg" } },
		{ id: "pi2", photoId: "p2", priceInCents: 300, photo: { originalFilename: null } },
	],
};

function setupValidSession() {
	mockGetClientGallerySession.mockResolvedValue({ tenantId: "t1", galleryId: "g1" });
	mockIsClientSessionValid.mockReturnValue(true);
}

/* ---- tests ---- */

describe("POST /api/p/galleries/[id]/purchase/checkout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when session invalid", async () => {
		mockGetClientGallerySession.mockResolvedValue(null);
		mockIsClientSessionValid.mockReturnValue(false);

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
	});

	it("returns 400 INVALID_BODY when content-type missing", async () => {
		setupValidSession();

		const res = await POST(makeRequestNoContentType(), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 400 INVALID_BODY when photoIds missing", async () => {
		setupValidSession();

		const res = await POST(makeRequest({}), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 400 INVALID_BODY when photoIds is empty array", async () => {
		setupValidSession();

		const res = await POST(makeRequest({ photoIds: [] }), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 400 INVALID_BODY when photoIds contains non-strings", async () => {
		setupValidSession();

		const res = await POST(makeRequest({ photoIds: [123] }), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 404 GALLERY_NOT_FOUND when gallery missing", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(null);

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "GALLERY_NOT_FOUND" });
	});

	it("returns 400 CLIENT_USERNAME_REQUIRED when clientUsername is null", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue({ id: "g1", clientUsername: null });

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "CLIENT_USERNAME_REQUIRED" });
	});

	it("returns 200 with purchase and checkoutUrl on success", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockResolvedValue(validPurchase);
		mockTenantFindUnique.mockResolvedValue({ stripeAccountId: "acct_123" });
		mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_1" });

		const res = await POST(makeRequest({ photoIds: ["p1", "p2"] }), makeParams("g1"));
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({
			id: "pur1",
			status: "PENDING",
			totalInCents: 800,
			platformFeeInCents: 0,
			items: [
				{ id: "pi1", photoId: "p1", priceInCents: 500 },
				{ id: "pi2", photoId: "p2", priceInCents: 300 },
			],
			checkoutUrl: "https://checkout.stripe.com/session_1",
		});
		expect(mockCreatePendingPurchase).toHaveBeenCalledWith({
			galleryId: "g1",
			clientUsername: "alice",
			photoIds: ["p1", "p2"],
		});
		expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: "payment",
				metadata: { purchaseId: "pur1" },
				payment_intent_data: { application_fee_amount: 0 },
			}),
			{ stripeAccount: "acct_123" },
		);
	});

	it("returns 422 STRIPE_NOT_CONNECTED when tenant has no stripeAccountId", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockResolvedValue(validPurchase);
		mockTenantFindUnique.mockResolvedValue({ stripeAccountId: null });

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "STRIPE_NOT_CONNECTED" });
	});

	it("returns 422 STRIPE_NOT_CONNECTED when tenant not found", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockResolvedValue(validPurchase);
		mockTenantFindUnique.mockResolvedValue(null);

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "STRIPE_NOT_CONNECTED" });
	});

	it("uses photo originalFilename in line_items product_data", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockResolvedValue(validPurchase);
		mockTenantFindUnique.mockResolvedValue({ stripeAccountId: "acct_123" });
		mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s" });

		await POST(makeRequest({ photoIds: ["p1", "p2"] }), makeParams("g1"));
		const createArgs = mockCheckoutSessionsCreate.mock.calls[0][0];
		expect(createArgs.line_items[0].price_data.product_data.name).toBe("sunset.jpg");
		expect(createArgs.line_items[1].price_data.product_data.name).toBe("Photo p2");
	});

	it("returns 403 PURCHASE_NOT_ENABLED", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("Purchasing is not enabled for this gallery"));

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "PURCHASE_NOT_ENABLED" });
	});

	it("returns 400 INVALID_BODY on duplicate photo IDs", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("Duplicate photo IDs"));

		const res = await POST(makeRequest({ photoIds: ["p1", "p1"] }), makeParams("g1"));
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "INVALID_BODY" });
	});

	it("returns 404 PHOTO_NOT_FOUND when photos missing", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("One or more photos not found in gallery"));

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "PHOTO_NOT_FOUND" });
	});

	it("returns 422 PHOTO_NOT_PRICED when photos unpriced", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("One or more photos do not have a price"));

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "PHOTO_NOT_PRICED" });
	});

	it("returns 404 GALLERY_NOT_FOUND on DB gallery error", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("Gallery not found"));

		const res = await POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"));
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "GALLERY_NOT_FOUND" });
	});

	it("rethrows unknown errors", async () => {
		setupValidSession();
		mockGalleryFindFirst.mockResolvedValue(validGallery);
		mockCreatePendingPurchase.mockRejectedValue(new Error("unexpected"));

		await expect(POST(makeRequest({ photoIds: ["p1"] }), makeParams("g1"))).rejects.toThrow("unexpected");
	});
});
