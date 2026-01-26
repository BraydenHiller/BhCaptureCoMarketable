import { describe, it, expect } from 'vitest';
import { signInTenant } from './tenantAuth';

describe('tenantAuth', () => {
	it('signInTenant throws not implemented error', async () => {
		await expect(signInTenant('user', 'pass')).rejects.toThrow('Tenant auth not implemented yet');
	});
});
