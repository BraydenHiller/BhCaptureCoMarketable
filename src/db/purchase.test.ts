import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("./requestDb", () => ({
	getRequestDb: vi.fn(),
}));

vi.mock("@/lib/requestScope", () => ({
	requireScopedTenantId: vi.fn(() => "t1"),
}));

import { getRequestDb } from "./requestDb";
import {
	getPurchasableGallery,
	listGalleryPricedPhotos,
	setPhotoPrice,
	getPhotoPurchaseEligibility,
	createPendingPurchase,
	markPurchaseCompleted,
	listClientCompletedEntitlements,
} from "./purchase";

/* ---------- helpers ---------- */

function makeGallery(overrides: Record<string, unknown> = {}) {
	return {
		id: "g1",
		tenantId: "t1",
		accessMode: "PRIVATE",
		proofingStatus: "PENDING",
		purchaseEnabled: true,
		purchaseAfterProof: false,
		...overrides,
	};
}

function makePhoto(overrides: Record<string, unknown> = {}) {
	return {
		id: "p1",
		tenantId: "t1",
		galleryId: "g1",
		priceInCents: 500,
		sortOrder: 0,
		storageKey: "key",
		originalFilename: "photo.jpg",
		...overrides,
	};
}

function makePurchase(overrides: Record<string, unknown> = {}) {
	return {
		id: "pur1",
		tenantId: "t1",
		galleryId: "g1",
		clientUsername: "client1",
		status: "PENDING",
		totalInCents: 500,
		platformFeeInCents: 0,
		stripePaymentIntentId: null,
		completedAt: null,
		items: [],
		...overrides,
	};
}

function makeMockDb(overrides: Record<string, unknown> = {}) {
	const db = {
		gallery: { findFirst: vi.fn() },
		photo: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
		purchase: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
		$transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
		...overrides,
	} as unknown as PrismaClient & Record<string, unknown>;
	return db;
}

/* ---------- getPurchasableGallery ---------- */

describe("getPurchasableGallery", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("returns gallery with purchase fields", async () => {
		const gallery = makeGallery();
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(gallery);
		const result = await getPurchasableGallery("g1");
		expect(result).toEqual(gallery);
		expect(db.gallery.findFirst).toHaveBeenCalledWith({
			where: { id: "g1", tenantId: "t1" },
			select: {
				id: true,
				tenantId: true,
				accessMode: true,
				proofingStatus: true,
				purchaseEnabled: true,
				purchaseAfterProof: true,
			},
		});
	});

	it("throws Gallery not found when missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(getPurchasableGallery("g1")).rejects.toThrow("Gallery not found");
	});
});

/* ---------- listGalleryPricedPhotos ---------- */

describe("listGalleryPricedPhotos", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("returns photos ordered by sortOrder asc, createdAt asc", async () => {
		const photos = [makePhoto()];
		(db.photo.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(photos);
		const result = await listGalleryPricedPhotos("g1");
		expect(result).toEqual(photos);
		expect(db.photo.findMany).toHaveBeenCalledWith({
			where: { tenantId: "t1", galleryId: "g1" },
			orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
		});
	});
});

/* ---------- setPhotoPrice ---------- */

describe("setPhotoPrice", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("sets price on photo with tenant scope", async () => {
		(db.photo.update as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto({ priceInCents: 1000 }));
		const result = await setPhotoPrice("p1", 1000);
		expect(result.priceInCents).toBe(1000);
		expect(db.photo.update).toHaveBeenCalledWith({
			where: { id: "p1", tenantId: "t1" },
			data: { priceInCents: 1000 },
		});
	});

	it("allows null to clear price", async () => {
		(db.photo.update as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto({ priceInCents: null }));
		await setPhotoPrice("p1", null);
		expect(db.photo.update).toHaveBeenCalledWith({
			where: { id: "p1", tenantId: "t1" },
			data: { priceInCents: null },
		});
	});

	it("rejects negative price", async () => {
		await expect(setPhotoPrice("p1", -1)).rejects.toThrow("Price must not be negative");
		expect(db.photo.update).not.toHaveBeenCalled();
	});

	it("allows zero price", async () => {
		(db.photo.update as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto({ priceInCents: 0 }));
		await setPhotoPrice("p1", 0);
		expect(db.photo.update).toHaveBeenCalledWith({
			where: { id: "p1", tenantId: "t1" },
			data: { priceInCents: 0 },
		});
	});
});

/* ---------- getPhotoPurchaseEligibility ---------- */

describe("getPhotoPurchaseEligibility", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("returns eligible when purchaseEnabled and photo has price", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto());
		const result = await getPhotoPurchaseEligibility("g1", "p1");
		expect(result.eligible).toBe(true);
		expect(result.reason).toBeNull();
	});

	it("returns ineligible when purchaseEnabled is false", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ purchaseEnabled: false }));
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto());
		const result = await getPhotoPurchaseEligibility("g1", "p1");
		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("Purchasing is not enabled for this gallery");
	});

	it("returns ineligible when purchaseAfterProof and proofing not submitted", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeGallery({ accessMode: "PRIVATE", purchaseAfterProof: true, proofingStatus: "PENDING" }),
		);
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto());
		const result = await getPhotoPurchaseEligibility("g1", "p1");
		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("Proofing must be submitted before purchasing");
	});

	it("returns eligible when purchaseAfterProof and proofing is submitted", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeGallery({ accessMode: "PRIVATE", purchaseAfterProof: true, proofingStatus: "SUBMITTED" }),
		);
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto());
		const result = await getPhotoPurchaseEligibility("g1", "p1");
		expect(result.eligible).toBe(true);
		expect(result.reason).toBeNull();
	});

	it("returns ineligible when photo has no price", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makePhoto({ priceInCents: null }));
		const result = await getPhotoPurchaseEligibility("g1", "p1");
		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("Photo does not have a price");
	});

	it("throws Gallery not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(getPhotoPurchaseEligibility("g1", "p1")).rejects.toThrow("Gallery not found");
	});

	it("throws Photo not found when photo missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(getPhotoPurchaseEligibility("g1", "p1")).rejects.toThrow("Photo not found");
	});
});

/* ---------- createPendingPurchase ---------- */

describe("createPendingPurchase", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("creates purchase with items in transaction", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		const photos = [
			makePhoto({ id: "p1", priceInCents: 500 }),
			makePhoto({ id: "p2", priceInCents: 300 }),
		];
		(db.photo.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(photos);
		const purchase = makePurchase({ totalInCents: 800, items: [{ photoId: "p1" }, { photoId: "p2" }] });
		(db.purchase.create as ReturnType<typeof vi.fn>).mockResolvedValue(purchase);

		const result = await createPendingPurchase({
			galleryId: "g1",
			clientUsername: "client1",
			photoIds: ["p1", "p2"],
		});

		expect(result.totalInCents).toBe(800);
		expect(db.$transaction).toHaveBeenCalled();
		expect(db.purchase.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					tenantId: "t1",
					galleryId: "g1",
					clientUsername: "client1",
					status: "PENDING",
					totalInCents: 800,
					platformFeeInCents: 0,
				}),
			}),
		);
	});

	it("applies platformFeeInCents when provided", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makePhoto()]);
		(db.purchase.create as ReturnType<typeof vi.fn>).mockResolvedValue(makePurchase({ platformFeeInCents: 50 }));

		await createPendingPurchase({
			galleryId: "g1",
			clientUsername: "client1",
			photoIds: ["p1"],
			platformFeeInCents: 50,
		});

		expect(db.purchase.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					platformFeeInCents: 50,
				}),
			}),
		);
	});

	it("rejects empty photoIds", async () => {
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: [] }),
		).rejects.toThrow("At least one photo is required");
	});

	it("rejects duplicate photoIds", async () => {
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: ["p1", "p1"] }),
		).rejects.toThrow("Duplicate photo IDs");
	});

	it("throws when purchasing not enabled", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ purchaseEnabled: false }));
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: ["p1"] }),
		).rejects.toThrow("Purchasing is not enabled for this gallery");
	});

	it("throws when photo not found in gallery", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: ["p1"] }),
		).rejects.toThrow("One or more photos not found in gallery");
	});

	it("throws when photo has no price", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makePhoto({ priceInCents: null })]);
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: ["p1"] }),
		).rejects.toThrow("One or more photos do not have a price");
	});

	it("throws Gallery not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(
			createPendingPurchase({ galleryId: "g1", clientUsername: "client1", photoIds: ["p1"] }),
		).rejects.toThrow("Gallery not found");
	});
});

/* ---------- markPurchaseCompleted ---------- */

describe("markPurchaseCompleted", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("updates purchase with COMPLETED status and stripePaymentIntentId", async () => {
		const completed = makePurchase({
			status: "COMPLETED",
			completedAt: new Date(),
			stripePaymentIntentId: "pi_123",
		});
		(db.purchase.update as ReturnType<typeof vi.fn>).mockResolvedValue(completed);

		const result = await markPurchaseCompleted("pur1", "pi_123");
		expect(result.status).toBe("COMPLETED");
		expect(db.purchase.update).toHaveBeenCalledWith({
			where: { id: "pur1", tenantId: "t1" },
			data: {
				status: "COMPLETED",
				completedAt: expect.any(Date),
				stripePaymentIntentId: "pi_123",
			},
			include: {
				items: {
					orderBy: { createdAt: "asc" },
					include: {
						photo: { select: { id: true, galleryId: true, storageKey: true, originalFilename: true } },
					},
				},
			},
		});
	});
});

/* ---------- listClientCompletedEntitlements ---------- */

describe("listClientCompletedEntitlements", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("returns completed purchases for client and gallery", async () => {
		const purchases = [makePurchase({ status: "COMPLETED", completedAt: new Date() })];
		(db.purchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(purchases);
		const result = await listClientCompletedEntitlements("g1", "client1");
		expect(result).toEqual(purchases);
		expect(db.purchase.findMany).toHaveBeenCalledWith({
			where: { tenantId: "t1", galleryId: "g1", clientUsername: "client1", status: "COMPLETED" },
			orderBy: { completedAt: "asc" },
			include: {
				items: {
					orderBy: { createdAt: "asc" },
					include: {
						photo: { select: { id: true, galleryId: true, storageKey: true, originalFilename: true } },
					},
				},
			},
		});
	});

	it("returns empty array when no completed purchases", async () => {
		(db.purchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
		const result = await listClientCompletedEntitlements("g1", "client1");
		expect(result).toEqual([]);
	});
});
