import { getScopedTenantId } from '@/lib/requestScope';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const tenantId = getScopedTenantId();

	return (
		<div>
			<h2>Dashboard</h2>
			<p>Tenant ID: {tenantId ?? 'Unavailable'}</p>
		</div>
	);
}
