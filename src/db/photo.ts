import { getRequestDb } from "./requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";

export async function listPhotos(galleryId: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.findMany({
		where: { tenantId, galleryId },
		orderBy: { sortOrder: "asc" },
	});
}

export async function getPhoto(id: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.findUnique({
		where: { id, tenantId },
	});
}

export async function createPhoto(
	galleryId: string,
	data: {
		storageKey?: string;
		originalFilename?: string;
		mimeType?: string;
		bytes?: number;
		width?: number;
		height?: number;
		altText?: string;
		caption?: string;
		sortOrder?: number;
	}
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.create({
		data: { tenantId, galleryId, ...data },
	});
}

export async function updatePhoto(
	id: string,
	data: {
		storageKey?: string;
		originalFilename?: string;
		mimeType?: string;
		bytes?: number;
		width?: number;
		height?: number;
		altText?: string;
		caption?: string;
		sortOrder?: number;
	}
) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.update({
		where: { id, tenantId },
		data,
	});
}

export async function deletePhoto(id: string) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.photo.delete({
		where: { id, tenantId },
	});
}
