import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope } from '@/lib/requestScope';
import { tenantNav } from '@/lib/tenantNav';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Enforce main domain access (before auth checks)
	await requireMainDomain();

	// Enforce authenticated TENANT session using centralized guard
	const session = await requireTenantSession();

	// Establish request-scoped tenant context
	return runWithTenantScope(session.tenantId, () => (
		<html lang="en">
			<body>
				<header>
					<h1>Tenant Portal</h1>
					<nav>
						<ul>
							{tenantNav.map((item) => (
								<li key={item.key}>
									<Link href={item.href}>{item.label}</Link>
								</li>
							))}
						</ul>
					</nav>
				</header>
				<main>{children}</main>
			</body>
		</html>
	));
}
