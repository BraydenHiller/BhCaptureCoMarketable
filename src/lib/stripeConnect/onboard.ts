import { requireTenantSessionAllowUnpaid } from '@/lib/auth/requireTenantSession';
import { prisma } from '@/db/prisma';
import { getStripe, getStripeConnectReturnUrl, getStripeConnectRefreshUrl } from '@/lib/stripe';
import { getRequestBaseUrl } from '@/lib/http/baseUrl';

export async function createStripeConnectOnboardingUrl(request: Request): Promise<string> {
	const session = await requireTenantSessionAllowUnpaid();

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			id: true,
			stripeAccountId: true,
		},
	});

	if (!tenant) {
		throw new Error('Tenant not found');
	}

	const stripe = getStripe();
	let stripeAccountId = tenant.stripeAccountId;

	if (!stripeAccountId) {
		const account = await stripe.accounts.create({
			type: 'express',
		});

		stripeAccountId = account.id;

		await prisma.tenant.update({
			where: { id: tenant.id },
			data: { stripeAccountId },
		});
	}

	const baseUrl = getRequestBaseUrl(request);

	const accountLink = await stripe.accountLinks.create({
		account: stripeAccountId,
		refresh_url: getStripeConnectRefreshUrl(baseUrl),
		return_url: getStripeConnectReturnUrl(baseUrl),
		type: 'account_onboarding',
	});

	return accountLink.url;
}
