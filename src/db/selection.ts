import { getRequestDb } from "./requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";

const SELECTION_INCLUDE = {
	items: {
		orderBy: { createdAt: "asc" as const },
		include: { photo: { select: { id: true, galleryId: true } } },
	},
};

async function loadGallery(galleryId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await db.gallery.findFirst({
		where: { id: galleryId, tenantId },
		select: { id: true, tenantId: true, accessMode: true, maxSelections: true },
	});
	if (!gallery) throw new Error("Gallery not found");
	if (gallery.accessMode !== "PRIVATE") throw new Error("Gallery is not private");
	return gallery;
}

export async function createOrGetDraftSelection(
	galleryId: string,
	clientUsername: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	await loadGallery(galleryId);

	return db.$transaction(async (tx) => {
		const existing = await tx.proofSelection.findFirst({
			where: { tenantId, galleryId, clientUsername },
			include: SELECTION_INCLUDE,
		});
		if (existing) {
			if (existing.status === "SUBMITTED") throw new Error("Selection is submitted");
			return existing;
		}
		return tx.proofSelection.create({
			data: { tenantId, galleryId, clientUsername },
			include: SELECTION_INCLUDE,
		});
	});
}

export async function addPhotoToSelection(
	galleryId: string,
	clientUsername: string,
	photoId: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	await loadGallery(galleryId);

	const photo = await db.photo.findFirst({
		where: { id: photoId, tenantId, galleryId },
	});
	if (!photo) throw new Error("Photo not found");

	const selection = await createOrGetDraftSelection(galleryId, clientUsername);

	const existingItem = await db.proofSelectionItem.findFirst({
		where: { tenantId, selectionId: selection.id, photoId },
	});

	if (!existingItem) {
		await db.proofSelectionItem.create({
			data: { tenantId, selectionId: selection.id, photoId },
		});
	}

	return db.proofSelection.findFirst({
		where: { tenantId, galleryId, clientUsername },
		include: SELECTION_INCLUDE,
	});
}

export async function removePhotoFromSelection(
	galleryId: string,
	clientUsername: string,
	photoId: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	await loadGallery(galleryId);

	const photo = await db.photo.findFirst({
		where: { id: photoId, tenantId, galleryId },
	});
	if (!photo) throw new Error("Photo not found");

	const selection = await createOrGetDraftSelection(galleryId, clientUsername);

	await db.proofSelectionItem.deleteMany({
		where: { tenantId, selectionId: selection.id, photoId },
	});

	return db.proofSelection.findFirst({
		where: { tenantId, galleryId, clientUsername },
		include: SELECTION_INCLUDE,
	});
}

export async function submitSelection(
	galleryId: string,
	clientUsername: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const gallery = await loadGallery(galleryId);

	return db.$transaction(async (tx) => {
		const selection = await tx.proofSelection.findFirst({
			where: { tenantId, galleryId, clientUsername },
			include: SELECTION_INCLUDE,
		});
		if (!selection) throw new Error("Selection not found");
		if (selection.status === "SUBMITTED") throw new Error("Selection is submitted");

		if (gallery.maxSelections != null && selection.items.length > gallery.maxSelections) {
			throw new Error("Selection exceeds max selections");
		}

		const result = await tx.proofSelection.updateMany({
			where: { id: selection.id, tenantId },
			data: { status: "SUBMITTED", submittedAt: new Date() },
		});
		if (result.count === 0) throw new Error("Selection not found");

		return tx.proofSelection.findFirst({
			where: { tenantId, galleryId, clientUsername },
			include: SELECTION_INCLUDE,
		});
	});
}

export async function getSelectionWithItems(
	galleryId: string,
	clientUsername: string,
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	await loadGallery(galleryId);
	return db.proofSelection.findFirst({
		where: { tenantId, galleryId, clientUsername },
		include: SELECTION_INCLUDE,
	});
}
