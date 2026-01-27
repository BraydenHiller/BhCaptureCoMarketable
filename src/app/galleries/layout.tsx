import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';

export const dynamic = 'force-dynamic';

export default async function GalleriesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireMainDomain();
	const session = await requireTenantSession();

	return runWithTenantScope(session.tenantId, () => (
		<div>
			{children}
		</div>
	));
}
