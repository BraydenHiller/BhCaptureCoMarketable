import { NextResponse } from 'next/server';
import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';
import { getTenantDomain, disableTenantDomain } from '@/db/tenantDomain';

export async function POST(request: Request) {
	await requireMainDomain();
	const session = await requireTenantSession();
	const contentType = request.headers.get('content-type') ?? '';
	const isJson = contentType.includes('application/json');

	try {
		return await runWithTenantScope(session.tenantId, async () => {
			const current = await getTenantDomain();
			if (!current) {
				return NextResponse.json({ error: 'NO_DOMAIN_CONNECTED' }, { status: 400 });
			}

			await disableTenantDomain(session.tenantId);
			if (!isJson) {
				return NextResponse.redirect(new URL('/app', request.url));
			}
			return NextResponse.json({ removed: true });
		});
	} catch {
		return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
	}
}
