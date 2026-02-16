import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Photo } from '@prisma/client';

let db: {
	tenant: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
	photo: {
		create: ReturnType<typeof vi.fn>;
		findUnique: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
	$transaction: ReturnType<typeof vi.fn>;
};

vi.mock('@/db/requestDb', () => ({
	getRequestDb: () => db,
}));

vi.mock('@/lib/requestScope', () => ({
	requireScopedTenantId: vi.fn(() => 't1'),
}));

vi.mock('@/lib/storage/s3', () => ({
	tenantPhotoKey: vi.fn(
		({ tenantId, galleryId, photoId, filename }) =>
			`tenant/${tenantId}/gallery/${galleryId}/photo/${photoId}/${filename}`
	),
}));

import { preparePhotoUpload, generateUploadUrl, finalizePhotoUpload } from './storage';
import { tenantPhotoKey } from '@/lib/storage/s3';

function makePhoto(overrides: Partial<Photo> = {}): Photo {
	return {
		id: 'p1',
		tenantId: 't1',
		galleryId: 'g1',
		storageKey: 't1/g1/uuid',
		originalFilename: null,
		mimeType: null,
		bytes: null,
		width: null,
		height: null,
		altText: null,
		caption: null,
		sortOrder: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

describe('storage service', () => {
	beforeEach(() => {
		db = {
			tenant: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			photo: {
				create: vi.fn(),
				findUnique: vi.fn(),
				update: vi.fn(),
			},
			$transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
		};
		vi.clearAllMocks();
	});

	it('preparePhotoUpload creates photo with tenant-scoped storage key', async () => {
		const mockPhoto = makePhoto({ id: 'photo-uuid', storageKey: 'tenant/t1/gallery/g1/photo/photo-uuid/example.jpg' });
		db.tenant.findUnique.mockResolvedValue({
			storageUsedBytes: BigInt(0),
			storageLimitBytes: BigInt(10_000),
			storageEnforced: true,
		});
		db.photo.create.mockResolvedValue(mockPhoto);
		const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('photo-uuid');

		const result = await preparePhotoUpload('g1', {
			uploadSizeBytes: 1234,
			mimeType: 'image/jpeg',
			originalFilename: 'example.jpg',
		});

		expect(tenantPhotoKey).toHaveBeenCalledWith({
			tenantId: 't1',
			galleryId: 'g1',
			photoId: 'photo-uuid',
			filename: 'example.jpg',
		});
		expect(db.photo.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				id: 'photo-uuid',
				tenantId: 't1',
				galleryId: 'g1',
				storageKey: mockPhoto.storageKey,
				originalFilename: 'example.jpg',
				mimeType: 'image/jpeg',
			}),
		});
		expect(result.photo).toBe(mockPhoto);
		expect(result.uploadUrl).toContain('/api/storage/dev/upload/');
		expect(result.uploadUrl).toContain(encodeURIComponent('tenant/t1/gallery/g1/photo/photo-uuid/example.jpg'));
		expect(result.uploadUrl).toContain('sig=');
		expect(result.photoId).toBe('photo-uuid');
		expect(result.storageKey).toBe(mockPhoto.storageKey);
		uuidSpy.mockRestore();
	});

	it('generateUploadUrl signs only the exact key', () => {
		const url1 = generateUploadUrl('t1/g1/key1');
		const url2 = generateUploadUrl('t1/g1/key2');

		expect(url1).toContain(encodeURIComponent('t1/g1/key1'));
		expect(url1).toContain('sig=');
		expect(url2).toContain(encodeURIComponent('t1/g1/key2'));
		expect(url2).toContain('sig=');
		expect(url1).not.toBe(url2);
	});

	it('finalizePhotoUpload updates photo metadata', async () => {
		const mockUpdatedPhoto = makePhoto({ id: 'p1', bytes: 1234 });
		db.photo.findUnique.mockResolvedValue({ tenantId: 't1', bytes: null });
		db.photo.update.mockResolvedValue(mockUpdatedPhoto);
		db.tenant.findUnique.mockResolvedValue({ storageUsedBytes: BigInt(1000) });

		const result = await finalizePhotoUpload('p1', { bytes: 1234, width: 100, height: 200 });

		expect(db.photo.update).toHaveBeenCalledWith({
			where: { id: 'p1', tenantId: 't1' },
			data: { bytes: 1234, width: 100, height: 200 },
		});
		expect(db.tenant.update).toHaveBeenCalledWith({
			where: { id: 't1' },
			data: { storageUsedBytes: BigInt(2234) },
		});
		expect(result).toBe(mockUpdatedPhoto);
	});
});
