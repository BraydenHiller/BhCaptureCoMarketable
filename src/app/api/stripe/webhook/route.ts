import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/db/prisma';
import { env } from '@/lib/env';
import { BillingStatus } from '@prisma/client';
import type Stripe from 'stripe';

export async function POST(request: Request) {
	const stripe = getStripe();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}

	try {
		const rawBody = await request.text();
		const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

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
			case 'checkout.session.completed':
				{
					const session = event.data.object as Stripe.Checkout.Session;
					const purchaseId = session.metadata?.purchaseId;
					const paymentIntentId =
						typeof session.payment_intent === 'string'
							? session.payment_intent
							: session.payment_intent?.id ?? null;

					if (purchaseId && paymentIntentId) {
						await prisma.purchase.update({
							where: { id: purchaseId },
							data: {
								status: 'COMPLETED',
								completedAt: new Date(),
								stripePaymentIntentId: paymentIntentId,
							},
						});
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
