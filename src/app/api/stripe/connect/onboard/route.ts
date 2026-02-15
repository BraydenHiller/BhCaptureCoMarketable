import { NextResponse } from 'next/server';
import { createStripeConnectOnboardingUrl } from '@/lib/stripeConnect/onboard';
import { requireTenantSessionAllowUnpaid } from '@/lib/auth/requireTenantSession';

export async function POST(request: Request) {
	try {
		await requireTenantSessionAllowUnpaid();
		const url = await createStripeConnectOnboardingUrl(request);
		return NextResponse.json({ url });
	} catch (error) {
		if (error instanceof Error && error.message === 'Tenant not found') {
			return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
		}
		throw error;
	}
}
