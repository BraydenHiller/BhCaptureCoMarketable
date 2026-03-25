import { getRequestDb } from "./requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";

const PURCHASE_INCLUDE = {
	items: {
		orderBy: { createdAt: "asc" as const },
		include: { photo: { select: { id: true, galleryId: true, storageKey: true, originalFilename: true } } },
	},
};

/* ---------- private gallery guard ---------- */

async function loadPurchasableGallery(galleryId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await db.gallery.findFirst({
		where: { id: galleryId, tenantId },
		select: {
			id: true,
			tenantId: true,
			accessMode: true,
			proofingStatus: true,
			purchaseEnabled: true,
			purchaseAfterProof: true,
		},
	});
	if (!gallery) throw new Error("Gallery not found");
	return gallery;
}

/* ---------- exported functions ---------- */

export async function getPurchasableGallery(galleryId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await db.gallery.findFirst({
		where: { id: galleryId, tenantId },
		select: {
			id: true,
			tenantId: true,
			accessMode: true,
			proofingStatus: true,
			purchaseEnabled: true,
			purchaseAfterProof: true,
		},
	});
	if (!gallery) throw new Error("Gallery not found");
	return gallery;
}

export async function listGalleryPricedPhotos(galleryId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.findMany({
		where: { tenantId, galleryId },
		orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
	});
}

export async function setPhotoPrice(photoId: string, priceInCents: number | null) {
	if (priceInCents != null && priceInCents < 0) {
		throw new Error("Price must not be negative");
	}
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.update({
		where: { id: photoId, tenantId },
		data: { priceInCents },
	});
}

export async function getPhotoPurchaseEligibility(
	galleryId: string,
	photoId: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await loadPurchasableGallery(galleryId);

	const photo = await db.photo.findFirst({
		where: { id: photoId, tenantId, galleryId },
	});
	if (!photo) throw new Error("Photo not found");

	let eligible = true;
	let reason: string | null = null;

	if (!gallery.purchaseEnabled) {
		eligible = false;
		reason = "Purchasing is not enabled for this gallery";
	} else if (
		gallery.accessMode === "PRIVATE" &&
		gallery.purchaseAfterProof &&
		gallery.proofingStatus !== "SUBMITTED"
	) {
		eligible = false;
		reason = "Proofing must be submitted before purchasing";
	} else if (photo.priceInCents == null) {
		eligible = false;
		reason = "Photo does not have a price";
	}

	return { photo, eligible, reason };
}

export async function createPendingPurchase(input: {
	galleryId: string;
	clientUsername: string;
	photoIds: string[];
	platformFeeInCents?: number;
}) {
	const { galleryId, clientUsername, photoIds, platformFeeInCents } = input;

	if (photoIds.length === 0) throw new Error("At least one photo is required");
	if (new Set(photoIds).size !== photoIds.length) throw new Error("Duplicate photo IDs");

	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await loadPurchasableGallery(galleryId);

	if (!gallery.purchaseEnabled) throw new Error("Purchasing is not enabled for this gallery");

	return db.$transaction(async (tx) => {
		const photos = await tx.photo.findMany({
			where: { tenantId, galleryId, id: { in: photoIds } },
		});

		if (photos.length !== photoIds.length) throw new Error("One or more photos not found in gallery");

		const unpriced = photos.filter((p) => p.priceInCents == null);
		if (unpriced.length > 0) throw new Error("One or more photos do not have a price");

		const totalInCents = photos.reduce((sum, p) => sum + p.priceInCents!, 0);

		const purchase = await tx.purchase.create({
			data: {
				tenantId,
				galleryId,
				clientUsername,
				status: "PENDING",
				totalInCents,
				platformFeeInCents: platformFeeInCents ?? 0,
				items: {
					create: photos.map((p) => ({
						tenantId,
						photoId: p.id,
						priceInCents: p.priceInCents!,
					})),
				},
			},
			include: PURCHASE_INCLUDE,
		});

		return purchase;
	});
}

export async function markPurchaseCompleted(purchaseId: string, stripePaymentIntentId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.purchase.update({
		where: { id: purchaseId, tenantId },
		data: {
			status: "COMPLETED",
			completedAt: new Date(),
			stripePaymentIntentId,
		},
		include: PURCHASE_INCLUDE,
	});
}

export async function listClientCompletedEntitlements(galleryId: string, clientUsername: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.purchase.findMany({
		where: { tenantId, galleryId, clientUsername, status: "COMPLETED" },
		orderBy: { completedAt: "asc" },
		include: PURCHASE_INCLUDE,
	});
}
