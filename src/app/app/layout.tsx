import { requireRequestTenantId } from '@/lib/tenantRequest';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Enforce tenant context for all /app/** routes
	// Throws error with message like "Tenant required for host: <hostname>" if tenant cannot be resolved
	await requireRequestTenantId();

	// Require authenticated tenant session
	const session = await getSession();
	if (!session || session.role !== 'TENANT') {
		redirect('/login');
	}

	return <>{children}</>;
}
