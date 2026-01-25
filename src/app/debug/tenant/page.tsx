import 'server-only';
import { headers } from 'next/headers';
import { getRequestHost, getRequestTenantId } from '@/lib/tenantRequest';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const h = await headers();
	const xfh = h.get('x-forwarded-host') ?? null;
	const hostHeader = h.get('host') ?? null;

	const resolvedHost = await getRequestHost();
	const tenantId = await getRequestTenantId();

	const row = (label: string, value: string | null) => (
		<div style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
			<strong style={{ width: 220 }}>{label}:</strong>
			<span>{value ?? '(null)'}</span>
		</div>
	);

	return (
		<div style={{ fontFamily: 'system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif', padding: 24 }}>
			<h1 style={{ marginBottom: 12 }}>Tenant debug</h1>
			{row('Resolved tenantId', tenantId)}
			{row('getRequestHost()', resolvedHost)}
			{row('header: x-forwarded-host', xfh)}
			{row('header: host', hostHeader)}
		</div>
	);
}
