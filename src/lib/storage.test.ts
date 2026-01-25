import { describe, it, expect, vi } from 'vitest';
import type { Photo } from '@prisma/client';

vi.mock('@/db/photo', () => ({
	createPhoto: vi.fn(),
	updatePhoto: vi.fn(),
}));

vi.mock('@/lib/requestScope', () => ({
	requireScopedTenantId: vi.fn(() => 't1'),
}));

import { preparePhotoUpload, generateUploadUrl, finalizePhotoUpload } from './storage';
import { createPhoto, updatePhoto } from '@/db/photo';

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
	it('preparePhotoUpload creates photo with tenant-scoped storage key', async () => {
		const mockPhoto = makePhoto({ id: 'p1', storageKey: 't1/g1/uuid' });
		vi.mocked(createPhoto).mockResolvedValue(mockPhoto);

		const result = await preparePhotoUpload('g1', { mimeType: 'image/jpeg' });

		expect(createPhoto).toHaveBeenCalledWith('g1', expect.objectContaining({ storageKey: expect.stringMatching(/^t1\/g1\//) }));
		expect(result.photo).toBe(mockPhoto);
		expect(result.uploadUrl).toContain('dev-storage.example.com/upload/t1/g1/');
	});

	it('generateUploadUrl signs only the exact key', () => {
		const url1 = generateUploadUrl('t1/g1/key1');
		const url2 = generateUploadUrl('t1/g1/key2');

		expect(url1).toContain('t1/g1/key1');
		expect(url1).toContain('sig=');
		expect(url2).toContain('t1/g1/key2');
		expect(url2).toContain('sig=');
		expect(url1).not.toBe(url2);
	});

	it('finalizePhotoUpload updates photo metadata', async () => {
		const mockUpdatedPhoto = makePhoto({ id: 'p1', bytes: 1234 });
		vi.mocked(updatePhoto).mockResolvedValue(mockUpdatedPhoto);

		const result = await finalizePhotoUpload('p1', { bytes: 1234, width: 100, height: 200 });

		expect(updatePhoto).toHaveBeenCalledWith('p1', { bytes: 1234, width: 100, height: 200 });
		expect(result).toBe(mockUpdatedPhoto);
	});
});
