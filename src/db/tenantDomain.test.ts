import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

vi.mock('./requestDb', () => ({
	getRequestDb: vi.fn(),
}));

vi.mock('@/lib/requestScope', () => ({
	requireScopedTenantId: vi.fn(() => 't1'),
}));

vi.mock('./prisma', () => ({
	prisma: { tenantDomain: { updateMany: vi.fn(), update: vi.fn() } },
}));

import { TenantDomainStatus } from '@prisma/client';
import { getRequestDb } from './requestDb';
import { prisma } from './prisma';
import {
	getTenantDomain,
	createOrResetTenantDomain,
	markTenantDomainVerified,
	setTenantDomainStatusActive,
	disableTenantDomain,
} from './tenantDomain';

describe('tenantDomain data access', () => {
	it('getTenantDomain calls findUnique with scoped tenantId and returns value', async () => {
		const mockTenantDomain = { id: 'td1' };
		const mockDb = {
			tenantDomain: { findUnique: vi.fn().mockResolvedValue(mockTenantDomain) },
		} as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		const result = await getTenantDomain();

		expect(mockDb.tenantDomain.findUnique).toHaveBeenCalledWith({
			where: { tenantId: 't1' },
		});
		expect(result).toBe(mockTenantDomain);
	});

	it('createOrResetTenantDomain upserts with PENDING_VERIFICATION and resets timestamps', async () => {
		const mockDb = {
			tenantDomain: { upsert: vi.fn().mockResolvedValue({ id: 'td1' }) },
		} as unknown as PrismaClient;
		vi.mocked(getRequestDb).mockReturnValue(mockDb);

		await createOrResetTenantDomain({
			hostname: 'example.com',
			verificationToken: 'token-1',
			txtRecordName: '_verify.example.com',
			txtRecordValue: 'value-1',
		});

		expect(mockDb.tenantDomain.upsert).toHaveBeenCalledWith({
			where: { tenantId: 't1' },
			update: {
				hostname: 'example.com',
				status: TenantDomainStatus.PENDING_VERIFICATION,
				verificationToken: 'token-1',
				txtRecordName: '_verify.example.com',
				txtRecordValue: 'value-1',
				verifiedAt: null,
				activatedAt: null,
				disabledAt: null,
			},
			create: {
				tenantId: 't1',
				hostname: 'example.com',
				status: TenantDomainStatus.PENDING_VERIFICATION,
				verificationToken: 'token-1',
				txtRecordName: '_verify.example.com',
				txtRecordValue: 'value-1',
			},
		});
	});

	it('markTenantDomainVerified updates status VERIFIED and sets verifiedAt', async () => {
		await markTenantDomainVerified('t1', 'example.com');

		expect(prisma.tenantDomain.updateMany).toHaveBeenCalledWith({
			where: { tenantId: 't1', hostname: 'example.com' },
			data: {
				status: TenantDomainStatus.VERIFIED,
				verifiedAt: expect.any(Date),
				disabledAt: null,
			},
		});
	});

	it('setTenantDomainStatusActive updates status ACTIVE and sets activatedAt', async () => {
		await setTenantDomainStatusActive('t1');

		expect(prisma.tenantDomain.update).toHaveBeenCalledWith({
			where: { tenantId: 't1' },
			data: {
				status: TenantDomainStatus.ACTIVE,
				activatedAt: expect.any(Date),
			},
		});
	});

	it('disableTenantDomain updates status DISABLED and sets disabledAt', async () => {
		await disableTenantDomain('t1');

		expect(prisma.tenantDomain.update).toHaveBeenCalledWith({
			where: { tenantId: 't1' },
			data: {
				status: TenantDomainStatus.DISABLED,
				disabledAt: expect.any(Date),
			},
		});
	});
});
