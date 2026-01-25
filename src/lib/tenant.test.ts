import { describe, it, expect, vi } from 'vitest';

// Module-level mock for prisma to avoid real DB access
vi.mock('../db/prisma', () => {
	const findUnique = vi.fn();
	return {
		prisma: {
			tenant: {
				findUnique,
			},
		},
	};
});

type FindUniqueMock = { mockResolvedValue: (v: { id: string; slug: string } | null) => void };

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
	it('returns tenantId and tenantSlug when tenant exists', async () => {
		const prismaMod = await import('../db/prisma');
		const mocked = (prismaMod.prisma.tenant.findUnique as unknown) as FindUniqueMock;
		mocked.mockResolvedValue({ id: 't1', slug: 'acme' });

		const { requireTenantContext } = await import('./tenant');
		const ctx = await requireTenantContext({ host: 'acme.example.com' });
		expect(ctx).toEqual({ tenantId: 't1', tenantSlug: 'acme' });
	});

	it('throws when tenant is not found', async () => {
		const prismaMod = await import('../db/prisma');
		const mocked = (prismaMod.prisma.tenant.findUnique as unknown) as FindUniqueMock;
		mocked.mockResolvedValue(null);

		const { requireTenantContext } = await import('./tenant');
		await expect(requireTenantContext({ host: 'acme.example.com' })).rejects.toThrow('Tenant not found');
	});
});
