import { describe, it, expect } from 'vitest';
import { verifyMasterAdmin, MASTER_ADMIN_USERNAME } from './masterAdmin';

describe('verifyMasterAdmin', () => {
	it('returns true for correct username and password', async () => {
		const result = await verifyMasterAdmin(MASTER_ADMIN_USERNAME, 'admin123');
		expect(result).toBe(true);
	});

	it('returns false for correct username and incorrect password', async () => {
		const result = await verifyMasterAdmin(MASTER_ADMIN_USERNAME, 'wrong');
		expect(result).toBe(false);
	});

	it('returns false for incorrect username', async () => {
		const result = await verifyMasterAdmin('notadmin', 'admin123');
		expect(result).toBe(false);
	});
});
