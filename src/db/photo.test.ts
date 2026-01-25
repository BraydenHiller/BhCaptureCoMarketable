import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

vi.mock('./requestDb', () => ({
	getRequestDb: vi.fn(),
}));

vi.mock('@/lib/requestScope', () => ({
	requireScopedTenantId: vi.fn(() => 't1'),
}));

import { getRequestDb } from './requestDb';
import { listPhotos, getPhoto, createPhoto, updatePhoto, deletePhoto } from './photo';

describe('photo data access', () => {
	it('listPhotos includes tenantId and galleryId', async () => {
		const mockPhoto = {
			findMany: vi.fn().mockResolvedValue([]),
		};
		const mockDb = { photo: mockPhoto } as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await listPhotos('g1');

		expect(mockPhoto.findMany).toHaveBeenCalledWith({
			where: { tenantId: 't1', galleryId: 'g1' },
			orderBy: { sortOrder: 'asc' },
		});
	});

	it('getPhoto includes tenantId and id', async () => {
		const mockPhoto = {
			findUnique: vi.fn().mockResolvedValue(null),
		};
		const mockDb = { photo: mockPhoto } as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await getPhoto('p1');

		expect(mockPhoto.findUnique).toHaveBeenCalledWith({
			where: { id: 'p1', tenantId: 't1' },
		});
	});

	it('createPhoto includes tenantId and galleryId', async () => {
		const mockPhoto = {
			create: vi.fn().mockResolvedValue({ id: 'p1' }),
		};
		const mockDb = { photo: mockPhoto } as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await createPhoto('g1', { altText: 'test' });

		expect(mockPhoto.create).toHaveBeenCalledWith({
			data: { tenantId: 't1', galleryId: 'g1', altText: 'test' },
		});
	});

	it('updatePhoto includes tenantId and id', async () => {
		const mockPhoto = {
			update: vi.fn().mockResolvedValue({ id: 'p1' }),
		};
		const mockDb = { photo: mockPhoto } as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await updatePhoto('p1', { caption: 'updated' });

		expect(mockPhoto.update).toHaveBeenCalledWith({
			where: { id: 'p1', tenantId: 't1' },
			data: { caption: 'updated' },
		});
	});

	it('deletePhoto includes tenantId and id', async () => {
		const mockPhoto = {
			delete: vi.fn().mockResolvedValue({ id: 'p1' }),
		};
		const mockDb = { photo: mockPhoto } as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await deletePhoto('p1');

		expect(mockPhoto.delete).toHaveBeenCalledWith({
			where: { id: 'p1', tenantId: 't1' },
		});
	});
});
