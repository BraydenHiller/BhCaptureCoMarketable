import { describe, it, expect } from 'vitest';
import bcryptjs from 'bcryptjs';
import { isClientSessionValid, verifyClientPassword, verifyClientUsername } from './galleryClientAuth';

describe('galleryClientAuth', () => {
	it('validates client session matches tenant and gallery', () => {
		expect(isClientSessionValid(null, 't1', 'g1')).toBe(false);
		expect(isClientSessionValid({ tenantId: 't1', galleryId: 'g1' }, 't1', 'g1')).toBe(true);
		expect(isClientSessionValid({ tenantId: 't2', galleryId: 'g1' }, 't1', 'g1')).toBe(false);
		expect(isClientSessionValid({ tenantId: 't1', galleryId: 'g2' }, 't1', 'g1')).toBe(false);
	});

	it('verifies client username', () => {
		expect(verifyClientUsername('alice', 'alice')).toBe(true);
		expect(verifyClientUsername('alice', 'bob')).toBe(false);
		expect(verifyClientUsername('alice', null)).toBe(false);
	});

	it('verifies client password using bcryptjs', async () => {
		const hash = await bcryptjs.hash('secret', 10);
		await expect(verifyClientPassword('secret', hash)).resolves.toBe(true);
		await expect(verifyClientPassword('wrong', hash)).resolves.toBe(false);
		await expect(verifyClientPassword('secret', null)).resolves.toBe(false);
	});
});
