import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/db/prisma';
import { BillingStatus } from '@prisma/client';
import type Stripe from 'stripe';

export async function POST(request: Request) {
	const stripe = getStripe();
	const signature = request.headers.get('stripe-signature');
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!webhookSecret) {
		throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
	}

	if (!signature) {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		const rawBody = await request.text();
		const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

		switch (event.type) {
			case 'account.updated':
				{
					const account = event.data.object as Stripe.Account;

					if (account.details_submitted) {
						const tenant = await prisma.tenant.findUnique({
							where: { stripeAccountId: account.id },
							select: { id: true },
						});

						if (tenant) {
							await prisma.tenant.update({
								where: { id: tenant.id },
								data: {
									stripeOnboardingComplete: true,
									billingStatus: BillingStatus.ACTIVE,
								},
							});
						}
					}
				}
				break;
			default:
				break;
		}

		return NextResponse.json({ received: true });
	} catch {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}
}
