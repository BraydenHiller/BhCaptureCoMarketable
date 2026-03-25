import Stripe from 'stripe';
import { env } from '@/lib/env';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
	if (stripeSingleton) {
		return stripeSingleton;
	}

	stripeSingleton = new Stripe(env.STRIPE_SECRET_KEY, {
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
