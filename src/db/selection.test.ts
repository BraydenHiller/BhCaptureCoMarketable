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
	createOrGetDraftSelection,
	addPhotoToSelection,
	removePhotoFromSelection,
	submitSelection,
	getSelectionWithItems,
} from "./selection";

/* ---------- helpers ---------- */

function makeGallery(overrides: Record<string, unknown> = {}) {
	return {
		id: "g1",
		tenantId: "t1",
		accessMode: "PRIVATE",
		maxSelections: null,
		...overrides,
	};
}

function makeSelection(overrides: Record<string, unknown> = {}) {
	return {
		id: "sel1",
		tenantId: "t1",
		galleryId: "g1",
		clientUsername: "client1",
		status: "DRAFT",
		submittedAt: null,
		items: [],
		...overrides,
	};
}

function makeMockDb(overrides: Record<string, unknown> = {}) {
	const db = {
		gallery: { findFirst: vi.fn() },
		proofSelection: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
		proofSelectionItem: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
		photo: { findFirst: vi.fn() },
		$transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
		...overrides,
	} as unknown as PrismaClient & Record<string, unknown>;
	return db;
}

/* ---------- createOrGetDraftSelection ---------- */

describe("createOrGetDraftSelection", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("throws Gallery not found when gallery missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(createOrGetDraftSelection("g1", "client1")).rejects.toThrow("Gallery not found");
	});

	it("throws Gallery is not private when accessMode is PUBLIC", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ accessMode: "PUBLIC" }));
		await expect(createOrGetDraftSelection("g1", "client1")).rejects.toThrow("Gallery is not private");
	});

	it("returns existing DRAFT selection without creating", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		const existing = makeSelection();
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

		const result = await createOrGetDraftSelection("g1", "client1");
		expect(result).toBe(existing);
		expect(db.proofSelection.create).not.toHaveBeenCalled();
	});

	it("throws Selection is submitted when existing is SUBMITTED", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeSelection({ status: "SUBMITTED" }),
		);

		await expect(createOrGetDraftSelection("g1", "client1")).rejects.toThrow("Selection is submitted");
	});

	it("creates new DRAFT selection when none exists", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const created = makeSelection();
		(db.proofSelection.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

		const result = await createOrGetDraftSelection("g1", "client1");
		expect(result).toEqual(created);
		expect(db.proofSelection.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { tenantId: "t1", galleryId: "g1", clientUsername: "client1" },
			}),
		);
	});
});

/* ---------- addPhotoToSelection ---------- */

describe("addPhotoToSelection", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("throws Gallery not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(addPhotoToSelection("g1", "client1", "p1")).rejects.toThrow("Gallery not found");
	});

	it("throws Gallery is not private", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ accessMode: "PUBLIC" }));
		await expect(addPhotoToSelection("g1", "client1", "p1")).rejects.toThrow("Gallery is not private");
	});

	it("throws Photo not found when photo missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		await expect(addPhotoToSelection("g1", "client1", "p1")).rejects.toThrow("Photo not found");
	});

	it("throws Photo not found when photo belongs to different gallery", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		await expect(addPhotoToSelection("g1", "client1", "p1")).rejects.toThrow("Photo not found");
	});

	it("throws Selection is submitted", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeSelection({ status: "SUBMITTED" }),
		);

		await expect(addPhotoToSelection("g1", "client1", "p1")).rejects.toThrow("Selection is submitted");
	});

	it("creates draft when selection missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		const created = makeSelection();
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(makeSelection({ items: [{ id: "i1", photoId: "p1" }] }));
		(db.proofSelection.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);
		(db.proofSelectionItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(db.proofSelectionItem.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "i1" });

		await addPhotoToSelection("g1", "client1", "p1");
		expect(db.proofSelection.create).toHaveBeenCalled();
	});

	it("is idempotent - does not create duplicate item", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		const sel = makeSelection({ items: [{ id: "i1", photoId: "p1" }] });
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(sel)
			.mockResolvedValueOnce(sel);
		(db.proofSelectionItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "i1" });

		await addPhotoToSelection("g1", "client1", "p1");
		expect(db.proofSelectionItem.create).not.toHaveBeenCalled();
	});

	it("creates item when not existing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		const sel = makeSelection();
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(sel)
			.mockResolvedValueOnce(makeSelection({ items: [{ id: "i1", photoId: "p1" }] }));
		(db.proofSelectionItem.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(db.proofSelectionItem.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "i1" });

		const result = await addPhotoToSelection("g1", "client1", "p1");
		expect(db.proofSelectionItem.create).toHaveBeenCalledWith({
			data: { tenantId: "t1", selectionId: "sel1", photoId: "p1" },
		});
		expect(result!.items).toHaveLength(1);
	});
});

/* ---------- removePhotoFromSelection ---------- */

describe("removePhotoFromSelection", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("throws Gallery not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(removePhotoFromSelection("g1", "client1", "p1")).rejects.toThrow("Gallery not found");
	});

	it("throws Gallery is not private", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ accessMode: "PUBLIC" }));
		await expect(removePhotoFromSelection("g1", "client1", "p1")).rejects.toThrow("Gallery is not private");
	});

	it("throws Photo not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(removePhotoFromSelection("g1", "client1", "p1")).rejects.toThrow("Photo not found");
	});

	it("throws Selection is submitted", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeSelection({ status: "SUBMITTED" }),
		);
		await expect(removePhotoFromSelection("g1", "client1", "p1")).rejects.toThrow("Selection is submitted");
	});

	it("creates draft when selection missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		const created = makeSelection();
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(created);
		(db.proofSelection.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);
		(db.proofSelectionItem.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

		const result = await removePhotoFromSelection("g1", "client1", "p1");
		expect(db.proofSelection.create).toHaveBeenCalled();
		expect(result).toEqual(created);
	});

	it("no-op when item does not exist", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.photo.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", tenantId: "t1", galleryId: "g1" });
		const sel = makeSelection();
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(sel)
			.mockResolvedValueOnce(sel);
		(db.proofSelectionItem.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

		const result = await removePhotoFromSelection("g1", "client1", "p1");
		expect(result).toEqual(sel);
		expect(db.proofSelectionItem.deleteMany).toHaveBeenCalled();
	});
});

/* ---------- submitSelection ---------- */

describe("submitSelection", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("throws Gallery not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(submitSelection("g1", "client1")).rejects.toThrow("Gallery not found");
	});

	it("throws Gallery is not private", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ accessMode: "PUBLIC" }));
		await expect(submitSelection("g1", "client1")).rejects.toThrow("Gallery is not private");
	});

	it("throws Selection is submitted when already submitted", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeSelection({ status: "SUBMITTED" }),
		);
		await expect(submitSelection("g1", "client1")).rejects.toThrow("Selection is submitted");
	});

	it("throws Selection exceeds max selections", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ maxSelections: 2 }));
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeSelection({
				items: [
					{ id: "i1", photoId: "p1" },
					{ id: "i2", photoId: "p2" },
					{ id: "i3", photoId: "p3" },
				],
			}),
		);
		await expect(submitSelection("g1", "client1")).rejects.toThrow("Selection exceeds max selections");
	});

	it("submits selection successfully when within limits", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ maxSelections: 5 }));
		const sel = makeSelection({ items: [{ id: "i1", photoId: "p1" }] });
		const submitted = { ...sel, status: "SUBMITTED", submittedAt: new Date() };
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(sel)
			.mockResolvedValueOnce(submitted);
		(db.proofSelection.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

		const result = await submitSelection("g1", "client1");
		expect(result!.status).toBe("SUBMITTED");
		expect(db.proofSelection.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sel1", tenantId: "t1" },
				data: { status: "SUBMITTED", submittedAt: expect.any(Date) },
			}),
		);
	});

	it("submits when maxSelections is null (no limit)", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ maxSelections: null }));
		const sel = makeSelection({ items: [{ id: "i1" }, { id: "i2" }, { id: "i3" }] });
		const submitted = { ...sel, status: "SUBMITTED", submittedAt: new Date() };
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(sel)
			.mockResolvedValueOnce(submitted);
		(db.proofSelection.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

		const result = await submitSelection("g1", "client1");
		expect(result!.status).toBe("SUBMITTED");
	});
});

/* ---------- getSelectionWithItems ---------- */

describe("getSelectionWithItems", () => {
	let db: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		db = makeMockDb();
		vi.mocked(getRequestDb).mockReturnValue(db as unknown as PrismaClient);
	});

	it("throws Gallery not found when gallery missing", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(getSelectionWithItems("g1", "client1")).rejects.toThrow("Gallery not found");
	});

	it("throws Gallery is not private", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery({ accessMode: "PUBLIC" }));
		await expect(getSelectionWithItems("g1", "client1")).rejects.toThrow("Gallery is not private");
	});

	it("returns null when gallery valid but selection not found", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const result = await getSelectionWithItems("g1", "client1");
		expect(result).toBeNull();
	});

	it("returns selection with items tenant-scoped", async () => {
		(db.gallery.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeGallery());
		const sel = makeSelection({ items: [{ id: "i1", photoId: "p1", photo: { id: "p1", galleryId: "g1" } }] });
		(db.proofSelection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sel);

		const result = await getSelectionWithItems("g1", "client1");
		expect(result).toEqual(sel);
		expect(db.proofSelection.findFirst).toHaveBeenCalledWith({
			where: { tenantId: "t1", galleryId: "g1", clientUsername: "client1" },
			include: {
				items: {
					orderBy: { createdAt: "asc" },
					include: { photo: { select: { id: true, galleryId: true } } },
				},
			},
		});
	});
});
