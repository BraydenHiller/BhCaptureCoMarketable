import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
	if (stripeSingleton) {
		return stripeSingleton;
	}

	const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

	if (!STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY environment variable is not set');
	}

	stripeSingleton = new Stripe(STRIPE_SECRET_KEY, {
		apiVersion: '2026-01-28.clover',
	});

	return stripeSingleton;
}

export function getStripeConnectReturnUrl(baseUrl: string): string {
	return `${baseUrl}/app/billing/stripe/return`;
}

export function getStripeConnectRefreshUrl(baseUrl: string): string {
	return `${baseUrl}/app/billing/stripe/refresh`;
}
