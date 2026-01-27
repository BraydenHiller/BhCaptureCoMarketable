import { getRequestDb } from '@/db/requestDb';
import { getScopedTenantId } from '@/lib/requestScope';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const tenantId = getScopedTenantId();
	const db = getRequestDb();

	const tenant = await db.tenant.findUnique({
		where: { id: tenantId! },
		select: { id: true, name: true, slug: true },
	});

	return (
		<div>
			<h2>Dashboard</h2>
			{tenant ? (
				<div>
					<p>Tenant: {tenant.name}</p>
					<p>ID: {tenant.id}</p>
					<p>Slug: {tenant.slug}</p>
				</div>
			) : (
				<p>Tenant information unavailable.</p>
			)}
		</div>
	);
}
