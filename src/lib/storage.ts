import type { Photo } from '@prisma/client';
import { requireScopedTenantId } from "@/lib/requestScope";
import { getRequestDb } from "@/db/requestDb";
import { tenantPhotoKey } from "@/lib/storage/s3";

export async function preparePhotoUpload(
	galleryId: string,
	data: { uploadSizeBytes: number; mimeType: string; originalFilename: string }
): Promise<{ photo: Photo; uploadUrl: string; photoId: string; storageKey: string }> {
	if (!Number.isFinite(data.uploadSizeBytes)) {
		throw new Error('UPLOAD_SIZE_REQUIRED');
	}

	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	const tenant = await db.tenant.findUnique({
		where: { id: tenantId },
		select: {
			storageUsedBytes: true,
			storageLimitBytes: true,
			storageEnforced: true,
		},
	});

	if (!tenant) {
		throw new Error('TENANT_NOT_FOUND');
	}

	if (tenant.storageEnforced) {
		const projected = tenant.storageUsedBytes + BigInt(data.uploadSizeBytes);
		if (projected > tenant.storageLimitBytes) {
			throw new Error('STORAGE_QUOTA_EXCEEDED');
		}
	}

	const photoId = crypto.randomUUID();
	const storageKey = tenantPhotoKey({
		tenantId,
		galleryId,
		photoId,
		filename: data.originalFilename,
	});
	const photo = await db.photo.create({
		data: {
			id: photoId,
			tenantId,
			galleryId,
			storageKey,
			originalFilename: data.originalFilename,
			mimeType: data.mimeType,
		},
	});
	const uploadUrl = generateUploadUrl(storageKey);
	return { photo, uploadUrl, photoId, storageKey };
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
	const db = getRequestDb();
	const tenantId = requireScopedTenantId();
	const bytes = metadata.bytes;

	if (!Number.isFinite(bytes) || !Number.isInteger(bytes) || bytes < 0) {
		throw new Error('INVALID_BYTES');
	}

	return db.$transaction(async (tx) => {
		const existing = await tx.photo.findUnique({
			where: { id, tenantId },
			select: { tenantId: true, bytes: true },
		});

		if (!existing) {
			throw new Error('PHOTO_NOT_FOUND');
		}

		const updated = await tx.photo.update({
			where: { id, tenantId },
			data: metadata,
		});

		const previousBytes = existing.bytes ?? null;
		const delta = previousBytes === null ? bytes : bytes - previousBytes;

		if (delta !== 0) {
			const tenant = await tx.tenant.findUnique({
				where: { id: existing.tenantId },
				select: { storageUsedBytes: true },
			});

			if (!tenant) {
				throw new Error('TENANT_NOT_FOUND');
			}

			let nextStorageUsed = tenant.storageUsedBytes + BigInt(delta);
			if (nextStorageUsed < BigInt(0)) {
				nextStorageUsed = BigInt(0);
			}

			await tx.tenant.update({
				where: { id: existing.tenantId },
				data: { storageUsedBytes: nextStorageUsed },
			});
		}

		return updated;
	});
}
