import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantDomainStatus } from '@prisma/client';

// Module-level mock for prisma to avoid real DB access
vi.mock('../db/prisma', () => {
	const findUnique = vi.fn();
	const tenantDomainFindUnique = vi.fn();
	return {
		prisma: {
			tenant: {
				findUnique,
			},
			tenantDomain: {
				findUnique: tenantDomainFindUnique,
			},
		},
	};
});

type TenantFindUniqueMock = { mockResolvedValue: (v: { id: string; slug: string } | null) => void };
type TenantDomainFindUniqueMock = {
	mockResolvedValue: (v: { tenant: { id: string; slug: string } | null; status: TenantDomainStatus } | null) => void;
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('resolveTenantFromHost', () => {
	it('parses subdomains and rejects localhost/IPs', async () => {
		const { resolveTenantFromHost } = await import('./tenant');
		expect(resolveTenantFromHost('acme.example.com')).toBe('acme');
		expect(resolveTenantFromHost('foo.bar.example.com')).toBe('foo');
		expect(resolveTenantFromHost('localhost')).toBeNull();
		expect(resolveTenantFromHost('127.0.0.1')).toBeNull();
	});
});

describe('requireTenantContext', () => {
	it('prefers active custom domain match over slug parsing', async () => {
		const prismaMod = await import('../db/prisma');
		const domainMocked = (prismaMod.prisma.tenantDomain.findUnique as unknown) as TenantDomainFindUniqueMock;
		const tenantMocked = (prismaMod.prisma.tenant.findUnique as unknown) as TenantFindUniqueMock;
		domainMocked.mockResolvedValue({
			status: TenantDomainStatus.ACTIVE,
			tenant: { id: 't2', slug: 'janedoe' },
		});

		const { requireTenantContext } = await import('./tenant');
		const ctx = await requireTenantContext({ host: 'janedoephotos.com' });
		expect(ctx).toEqual({ tenantId: 't2', tenantSlug: 'janedoe' });
		expect(tenantMocked).not.toHaveBeenCalled();
	});

	it('returns tenantId and tenantSlug when tenant exists', async () => {
		const prismaMod = await import('../db/prisma');
		const domainMocked = (prismaMod.prisma.tenantDomain.findUnique as unknown) as TenantDomainFindUniqueMock;
		domainMocked.mockResolvedValue(null);
		const mocked = (prismaMod.prisma.tenant.findUnique as unknown) as TenantFindUniqueMock;
		mocked.mockResolvedValue({ id: 't1', slug: 'acme' });

		const { requireTenantContext } = await import('./tenant');
		const ctx = await requireTenantContext({ host: 'acme.example.com' });
		expect(ctx).toEqual({ tenantId: 't1', tenantSlug: 'acme' });
	});

	it('falls back to slug parsing when domain is disabled', async () => {
		const prismaMod = await import('../db/prisma');
		const domainMocked = (prismaMod.prisma.tenantDomain.findUnique as unknown) as TenantDomainFindUniqueMock;
		domainMocked.mockResolvedValue({
			status: TenantDomainStatus.DISABLED,
			tenant: { id: 't9', slug: 'disabled' },
		});
		const mocked = (prismaMod.prisma.tenant.findUnique as unknown) as TenantFindUniqueMock;
		mocked.mockResolvedValue({ id: 't1', slug: 'acme' });

		const { requireTenantContext } = await import('./tenant');
		const ctx = await requireTenantContext({ host: 'acme.example.com' });
		expect(ctx).toEqual({ tenantId: 't1', tenantSlug: 'acme' });
	});

	it('throws when tenant is not found', async () => {
		const prismaMod = await import('../db/prisma');
		const domainMocked = (prismaMod.prisma.tenantDomain.findUnique as unknown) as TenantDomainFindUniqueMock;
		domainMocked.mockResolvedValue(null);
		const mocked = (prismaMod.prisma.tenant.findUnique as unknown) as TenantFindUniqueMock;
		mocked.mockResolvedValue(null);

		const { requireTenantContext } = await import('./tenant');
		await expect(requireTenantContext({ host: 'acme.example.com' })).rejects.toThrow('Tenant not found');
	});
});
