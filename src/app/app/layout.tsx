import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Enforce authenticated TENANT session using centralized guard
	const session = await requireTenantSession();

	// Establish request-scoped tenant context
	return runWithTenantScope(session.tenantId, () => (
		<html lang="en">
			<body>
				<header>
					<h1>Tenant Portal</h1>
				</header>
				<main>
					{children}
				</main>
			</body>
		</html>
	));
}
