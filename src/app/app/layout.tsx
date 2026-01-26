import { requireRequestTenantId } from '@/lib/tenantRequest';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Enforce tenant context for all /app/** routes
	// Throws error with message like "Tenant required for host: <hostname>" if tenant cannot be resolved
	await requireRequestTenantId();

	return <>{children}</>;
}
