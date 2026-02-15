import { describe, it, expect, vi, beforeEach } from 'vitest';

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
		webhooks: {
			constructEvent: vi.fn(),
		},
	};

	return {
		getStripe: () => stripeInstance,
	};
});

import { POST } from './route';

type StripeEvent = {
	type: string;
	data: { object: { id: string; details_submitted?: boolean } };
};

type TenantRow = { id: string };

describe('POST /api/stripe/webhook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
	});

	it('returns 400 when stripe-signature header is missing', async () => {
		const request = new Request('https://example.com/api/stripe/webhook', {
			method: 'POST',
			body: '{}',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({ error: 'Invalid signature' });
	});

	it('returns 400 when constructEvent throws', async () => {
		const stripeMock = (await import('@/lib/stripe')) as unknown as {
			getStripe: () => { webhooks: { constructEvent: ReturnType<typeof vi.fn> } };
		};
		const stripe = stripeMock.getStripe();
		stripe.webhooks.constructEvent.mockImplementation(() => {
			throw new Error('bad signature');
		});

		const request = new Request('https://example.com/api/stripe/webhook', {
			method: 'POST',
			headers: { 'stripe-signature': 'sig_test' },
			body: '{}',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data).toEqual({ error: 'Invalid signature' });
	});

	it('updates tenant when account.updated and details_submitted true', async () => {
		const stripeMock = (await import('@/lib/stripe')) as unknown as {
			getStripe: () => { webhooks: { constructEvent: ReturnType<typeof vi.fn> } };
		};
		const prismaMock = (await import('@/db/prisma')) as unknown as {
			prisma: {
				tenant: {
					findUnique: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};
		};

		const stripe = stripeMock.getStripe();
		stripe.webhooks.constructEvent.mockReturnValue({
			type: 'account.updated',
			data: { object: { id: 'acct_1', details_submitted: true } },
		} as StripeEvent);

		prismaMock.prisma.tenant.findUnique.mockResolvedValue({
			id: 't1',
		} as unknown as TenantRow);

		const request = new Request('https://example.com/api/stripe/webhook', {
			method: 'POST',
			headers: { 'stripe-signature': 'sig_test' },
			body: '{}',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(prismaMock.prisma.tenant.update).toHaveBeenCalledWith({
			where: { id: 't1' },
			data: { stripeOnboardingComplete: true, billingStatus: 'ACTIVE' },
		});
		expect(response.status).toBe(200);
		expect(data).toEqual({ received: true });
	});

	it('does not update tenant when account.updated and tenant not found', async () => {
		const stripeMock = (await import('@/lib/stripe')) as unknown as {
			getStripe: () => { webhooks: { constructEvent: ReturnType<typeof vi.fn> } };
		};
		const prismaMock = (await import('@/db/prisma')) as unknown as {
			prisma: {
				tenant: {
					findUnique: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};
		};

		const stripe = stripeMock.getStripe();
		stripe.webhooks.constructEvent.mockReturnValue({
			type: 'account.updated',
			data: { object: { id: 'acct_1', details_submitted: true } },
		} as StripeEvent);

		prismaMock.prisma.tenant.findUnique.mockResolvedValue(null);

		const request = new Request('https://example.com/api/stripe/webhook', {
			method: 'POST',
			headers: { 'stripe-signature': 'sig_test' },
			body: '{}',
		});

		const response = await POST(request);
		const data = await response.json();

		expect(prismaMock.prisma.tenant.update).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(data).toEqual({ received: true });
	});
});
