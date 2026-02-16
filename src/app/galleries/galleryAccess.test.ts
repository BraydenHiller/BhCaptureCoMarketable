import { describe, it, expect } from 'vitest';
import bcryptjs from 'bcryptjs';
import { buildGalleryAccess } from '@/lib/galleryAccess';

describe('buildGalleryAccess', () => {
	it('returns PUBLIC and clears credentials', async () => {
		const result = await buildGalleryAccess({
			accessMode: 'PUBLIC',
			clientUsername: 'user',
			clientPassword: 'pass',
			requirePassword: true,
		});

		expect(result).toEqual({
			accessMode: 'PUBLIC',
			clientUsername: null,
			clientPasswordHash: null,
		});
	});

	it('requires username and password for PRIVATE when requirePassword is true', async () => {
		await expect(
			buildGalleryAccess({
				accessMode: 'PRIVATE',
				clientUsername: 'client',
				clientPassword: '',
				requirePassword: true,
			})
		).rejects.toThrow('CLIENT_PASSWORD_REQUIRED');
	});

	it('hashes password for PRIVATE', async () => {
		const result = await buildGalleryAccess({
			accessMode: 'PRIVATE',
			clientUsername: 'client',
			clientPassword: 'secret',
			requirePassword: true,
		});

		expect(result.accessMode).toBe('PRIVATE');
		expect(result.clientUsername).toBe('client');
		expect(result.clientPasswordHash).toBeTruthy();
		const matches = await bcryptjs.compare('secret', result.clientPasswordHash ?? '');
		expect(matches).toBe(true);
	});

	it('keeps existing hash when updating PRIVATE without new password', async () => {
		const result = await buildGalleryAccess({
			accessMode: 'PRIVATE',
			clientUsername: 'client',
			clientPassword: '',
			existingPasswordHash: 'existing-hash',
			requirePassword: false,
		});

		expect(result).toEqual({
			accessMode: 'PRIVATE',
			clientUsername: 'client',
			clientPasswordHash: 'existing-hash',
		});
	});
});
