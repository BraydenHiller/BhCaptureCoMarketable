process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/bhcaptureco?schema=public";
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./session', () => ({
	getSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`REDIRECT:${url}`);
	}),
}));

describe('requireTenantSession', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns session when role is TENANT with tenantId', async () => {
		const { prisma } = await import('../../db/prisma');
		const slug = `test-tenant-${Date.now()}`;
		const tenant = await prisma.tenant.create({
			data: {
				name: 'Test Tenant',
				slug,
				status: 'ACTIVE',
				billingStatus: 'ACTIVE',
			},
		});

		const { getSession } = await import('./session');
		vi.mocked(getSession).mockResolvedValue({
			sub: 'user123',
			role: 'TENANT',
			tenantId: tenant.id,
			iat: 1000,
			exp: 2000,
		});

		const { requireTenantSession } = await import('./requireTenantSession');
		const session = await requireTenantSession();

		expect(session).toEqual({
			sub: 'user123',
			role: 'TENANT',
			tenantId: tenant.id,
			iat: 1000,
			exp: 2000,
		});
	});

	it('redirects to /login when no session', async () => {
		const { getSession } = await import('./session');
		vi.mocked(getSession).mockResolvedValue(null);

		const { requireTenantSession } = await import('./requireTenantSession');
		await expect(requireTenantSession()).rejects.toThrow('REDIRECT:/login');
	});

	it('redirects to /login when role is not TENANT', async () => {
		const { getSession } = await import('./session');
		vi.mocked(getSession).mockResolvedValue({
			sub: 'admin',
			role: 'MASTER_ADMIN',
			tenantId: undefined,
			iat: 1000,
			exp: 2000,
		});

		const { requireTenantSession } = await import('./requireTenantSession');
		await expect(requireTenantSession()).rejects.toThrow('REDIRECT:/login');
	});

	it('redirects to /login when tenantId is missing', async () => {
		const { getSession } = await import('./session');
		vi.mocked(getSession).mockResolvedValue({
			sub: 'user456',
			role: 'TENANT',
			tenantId: undefined,
			iat: 1000,
			exp: 2000,
		});

		const { requireTenantSession } = await import('./requireTenantSession');
		await expect(requireTenantSession()).rejects.toThrow('REDIRECT:/login');
	});
});
