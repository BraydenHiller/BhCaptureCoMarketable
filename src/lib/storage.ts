import type { Photo } from '@prisma/client';
import { createPhoto, updatePhoto } from "@/db/photo";
import { requireScopedTenantId } from "@/lib/requestScope";

export async function preparePhotoUpload(
	galleryId: string,
	data: { mimeType?: string; originalFilename?: string }
): Promise<{ photo: Photo; uploadUrl: string }> {
	const tenantId = requireScopedTenantId();
	const storageKey = `${tenantId}/${galleryId}/${crypto.randomUUID()}`;
	const photo = await createPhoto(galleryId, { storageKey, ...data });
	const uploadUrl = generateUploadUrl(storageKey);
	return { photo, uploadUrl };
}

export function generateUploadUrl(storageKey: string): string {
	// Development signer: deterministic signature based on key
	const signature = btoa(storageKey).slice(0, 16);
	return `https://dev-storage.example.com/upload/${storageKey}?sig=${signature}`;
}

export async function finalizePhotoUpload(
	id: string,
	metadata: { bytes: number; width: number; height: number }
): Promise<Photo> {
	return updatePhoto(id, metadata);
}
