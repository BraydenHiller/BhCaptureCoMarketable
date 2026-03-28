
import { Prisma } from "@prisma/client";
import { getRequestDb } from "./requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";

const PURCHASE_INCLUDE = {
 items: {
  include: {
   photo: {
	select: {
	 id: true,
	 galleryId: true,
	 storageKey: true,
	 originalFilename: true,
	},
   },
  },
 },
 gallery: { select: { downloadExpiryDays: true } },
} satisfies Prisma.PurchaseInclude;

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
 return db.$transaction(async (tx) => {
  // 1. Mark purchase as COMPLETED
	console.log("MARK_PURCHASE_START", purchaseId); const purchase = await tx.purchase.update({
	 where: { id: purchaseId, tenantId },
	 data: {
		status: "COMPLETED",
		completedAt: new Date(),
		stripePaymentIntentId,
	 },
	 include: {
		items: {
		 include: {
			photo: {
			 select: {
				id: true,
				galleryId: true,
				storageKey: true,
				originalFilename: true,
			 },
			},
		 },
		},
	 },
	});

  // 2. Fetch purchase items
  const items = await tx.purchaseItem.findMany({
   where: { purchaseId, tenantId },
   select: { photoId: true },
  });
  if (!purchase.galleryId || !purchase.clientUsername) {
   // Defensive: should never happen
   return purchase;
  }
  // 3. Fetch gallery.downloadExpiryDays
  const gallery = await tx.gallery.findFirst({
   where: { id: purchase.galleryId, tenantId },
   select: { downloadExpiryDays: true },
  });
  // 4. Prepare DownloadEntitlement records
  const now = new Date();
  let expiresAt: Date | null = null;
  const expiryDays = gallery?.downloadExpiryDays;
  if (expiryDays != null) {
   expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  }
  // 5. Avoid duplicates: fetch existing entitlements for this purchase
  const existing = await tx.downloadEntitlement.findMany({
   where: {
	tenantId,
	galleryId: purchase.galleryId,
	clientUsername: purchase.clientUsername,
	purchaseId,
	photoId: { in: items.map(i => i.photoId) },
   },
   select: { photoId: true },
  });
  const existingPhotoIds = new Set(existing.map((e: { photoId: string }) => e.photoId));
  const toCreate = items
   .filter(i => !existingPhotoIds.has(i.photoId))
   .map(i => ({
	tenantId,
	galleryId: purchase.galleryId,
	clientUsername: purchase.clientUsername,
	photoId: i.photoId,
	purchaseId,
	status: "ACTIVE" as const,
	grantedAt: now,
	expiresAt,
   }));
  console.log("ENTITLEMENTS_TO_CREATE", toCreate.length); if (toCreate.length > 0) {
   await tx.downloadEntitlement.createMany({ data: toCreate, skipDuplicates: true });
  }
  return purchase;
 });
}

export async function listClientCompletedEntitlements(galleryId: string, clientUsername: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const now = new Date();
	const entitlements = await db.downloadEntitlement.findMany({
		where: {
			tenantId,
			galleryId,
			clientUsername,
			status: "ACTIVE",
			OR: [
				{ expiresAt: null },
				{ expiresAt: { gt: now } },
			],
		},
		orderBy: { grantedAt: "asc" },
		include: {
			photo: {
				select: {
					id: true,
					galleryId: true,
					storageKey: true,
					originalFilename: true,
				},
			},
		},
	});
	// Always return an array, never undefined/null
	return (entitlements ?? []).map(e => ({
		...e,
		photo: e.photo,
	}));
}

