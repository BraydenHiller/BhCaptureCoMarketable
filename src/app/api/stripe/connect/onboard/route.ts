import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { prisma } from '@/db/prisma';
import { getStripe, getStripeConnectReturnUrl, getStripeConnectRefreshUrl } from '@/lib/stripe';
import { getRequestBaseUrl } from '@/lib/http/baseUrl';

export async function POST(request: Request) {
	const session = await requireTenantSession();

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			id: true,
			stripeAccountId: true,
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
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

	return NextResponse.json({ url: accountLink.url });
}
