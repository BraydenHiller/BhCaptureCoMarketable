import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

type TenantRow = { id: string; stripeAccountId: string | null };
type StripeAccount = { id: string };
type StripeAccountLink = { url: string };

vi.mock('@/lib/auth/requireTenantSession');
vi.mock('@/db/prisma', () => {
	return {
		prisma: {
			tenant: {
				findUnique: vi.fn(),
				update: vi.fn(),
			},
		},
	};
});
vi.mock('@/lib/stripe', () => {
	const stripeInstance = {
		accounts: { create: vi.fn() },
		accountLinks: { create: vi.fn() },
	};

	return {
		getStripe: () => stripeInstance,
		getStripeConnectReturnUrl: (baseUrl: string) => `${baseUrl}/app/billing/stripe/return`,
		getStripeConnectRefreshUrl: (baseUrl: string) => `${baseUrl}/app/billing/stripe/refresh`,
	};
});
vi.mock('@/lib/http/baseUrl');

describe('POST /api/stripe/connect/onboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates stripe account when stripeAccountId is missing and returns accountLink url', async () => {
		const { requireTenantSession } = await import('@/lib/auth/requireTenantSession');
		const prismaMock = (await import('@/db/prisma')) as unknown as {
			prisma: {
				tenant: {
					findUnique: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};
		};
		const stripeMock = (await import('@/lib/stripe')) as unknown as {
			getStripe: () => {
				accounts: { create: ReturnType<typeof vi.fn> };
				accountLinks: { create: ReturnType<typeof vi.fn> };
			};
			getStripeConnectReturnUrl: (baseUrl: string) => string;
			getStripeConnectRefreshUrl: (baseUrl: string) => string;
		};
		const stripe = stripeMock.getStripe();
		const { getRequestBaseUrl } = await import('@/lib/http/baseUrl');

		vi.mocked(requireTenantSession).mockResolvedValue({
			tenantId: 't1',
			role: 'TENANT',
			sub: 's1',
			iat: Date.now(),
			exp: Date.now() + 3600,
		});

		prismaMock.prisma.tenant.findUnique.mockResolvedValue({
			id: 't1',
			stripeAccountId: null,
		} as unknown as TenantRow);

		stripe.accounts.create.mockResolvedValue({
			id: 'acct_123',
		} as unknown as StripeAccount);

		prismaMock.prisma.tenant.update.mockResolvedValue({
			id: 't1',
		} as unknown as { id: string });

		vi.mocked(getRequestBaseUrl).mockReturnValue('https://example.com');

		stripe.accountLinks.create.mockResolvedValue({
			url: 'https://connect.stripe.com/setup/123',
		} as unknown as StripeAccountLink);

		const request = new Request('https://example.com/api/stripe/connect/onboard', {
			method: 'POST',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(stripe.accounts.create).toHaveBeenCalledWith({ type: 'express' });
		expect(stripe.accountLinks.create).toHaveBeenCalledWith({
			account: 'acct_123',
			refresh_url: 'https://example.com/app/billing/stripe/refresh',
			return_url: 'https://example.com/app/billing/stripe/return',
			type: 'account_onboarding',
		});
		expect(prismaMock.prisma.tenant.update).toHaveBeenCalledWith({
			where: { id: 't1' },
			data: { stripeAccountId: 'acct_123' },
		});
		expect(data).toEqual({ url: 'https://connect.stripe.com/setup/123' });
	});

	it('does not create stripe account when stripeAccountId already exists', async () => {
		const { requireTenantSession } = await import('@/lib/auth/requireTenantSession');
		const prismaMock = (await import('@/db/prisma')) as unknown as {
			prisma: {
				tenant: {
					findUnique: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};
		};
		const stripeMock = (await import('@/lib/stripe')) as unknown as {
			getStripe: () => {
				accounts: { create: ReturnType<typeof vi.fn> };
				accountLinks: { create: ReturnType<typeof vi.fn> };
			};
			getStripeConnectReturnUrl: (baseUrl: string) => string;
			getStripeConnectRefreshUrl: (baseUrl: string) => string;
		};
		const stripe = stripeMock.getStripe();
		const { getRequestBaseUrl } = await import('@/lib/http/baseUrl');

		vi.mocked(requireTenantSession).mockResolvedValue({
			tenantId: 't1',
			role: 'TENANT',
			sub: 's1',
			iat: Date.now(),
			exp: Date.now() + 3600,
		});

		prismaMock.prisma.tenant.findUnique.mockResolvedValue({
			id: 't1',
			stripeAccountId: 'acct_existing',
		} as unknown as TenantRow);

		vi.mocked(getRequestBaseUrl).mockReturnValue('https://example.com');

		stripe.accountLinks.create.mockResolvedValue({
			url: 'https://connect.stripe.com/setup/456',
		} as unknown as StripeAccountLink);

		const request = new Request('https://example.com/api/stripe/connect/onboard', {
			method: 'POST',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(stripe.accounts.create).not.toHaveBeenCalled();
		expect(prismaMock.prisma.tenant.update).not.toHaveBeenCalled();
		expect(stripe.accountLinks.create).toHaveBeenCalledWith({
			account: 'acct_existing',
			refresh_url: 'https://example.com/app/billing/stripe/refresh',
			return_url: 'https://example.com/app/billing/stripe/return',
			type: 'account_onboarding',
		});
		expect(data).toEqual({ url: 'https://connect.stripe.com/setup/456' });
	});

	it('returns 404 when tenant not found', async () => {
		const { requireTenantSession } = await import('@/lib/auth/requireTenantSession');
		const prismaMock = (await import('@/db/prisma')) as unknown as {
			prisma: {
				tenant: {
					findUnique: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};
		};

		vi.mocked(requireTenantSession).mockResolvedValue({
			tenantId: 't1',
			role: 'TENANT',
			sub: 's1',
			iat: Date.now(),
			exp: Date.now() + 3600,
		});

		prismaMock.prisma.tenant.findUnique.mockResolvedValue(null);

		const request = new Request('https://example.com/api/stripe/connect/onboard', {
			method: 'POST',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data).toEqual({ error: 'Tenant not found' });
	});
});
