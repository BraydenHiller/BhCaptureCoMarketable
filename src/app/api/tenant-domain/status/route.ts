import { NextResponse } from 'next/server';
import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';
import { getTenantDomain } from '@/db/tenantDomain';

export async function GET() {
	await requireMainDomain();
	const session = await requireTenantSession();

	try {
		const tenantDomain = await runWithTenantScope(session.tenantId, async () =>
			getTenantDomain()
		);

		if (!tenantDomain) {
			return NextResponse.json({ connected: false });
		}

		return NextResponse.json({
			connected: true,
			hostname: tenantDomain.hostname,
			status: tenantDomain.status,
			txtRecordName: tenantDomain.txtRecordName,
			txtRecordValue: tenantDomain.txtRecordValue,
			verifiedAt: tenantDomain.verifiedAt,
			activatedAt: tenantDomain.activatedAt,
			disabledAt: tenantDomain.disabledAt,
			createdAt: tenantDomain.createdAt,
			updatedAt: tenantDomain.updatedAt,
		});
	} catch {
		return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
	}
}
