import { getSession } from '@/lib/auth/session';
import { runWithTenantScope } from '@/lib/requestScope';
import { redirect } from 'next/navigation';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Enforce authenticated TENANT session
	const session = await getSession();
	if (!session || session.role !== 'TENANT') {
		redirect('/login');
	}

	// Enforce tenantId in session
	if (!session.tenantId) {
		redirect('/login');
	}

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
