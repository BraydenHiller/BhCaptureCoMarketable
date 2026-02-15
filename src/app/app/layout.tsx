import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { runWithTenantScope, requireScopedTenantId } from '@/lib/requestScope';
import { tenantNav } from '@/lib/tenantNav';
import { getRequestDb } from '@/db/requestDb';
import { redirect } from 'next/navigation';
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
	return runWithTenantScope(session.tenantId, async () => {
		// Load tenant record with scope already established
		const tenantId = requireScopedTenantId();
		const db = getRequestDb();
		const tenant = await db.tenant.findUnique({
			where: { id: tenantId },
			select: {
				id: true,
				status: true,
				billingStatus: true,
			},
		});

		// Check tenant status
		if (!tenant || tenant.status !== 'ACTIVE') {
			redirect('/login');
		}

		// Check billing status
		if (tenant.billingStatus !== 'ACTIVE') {
			redirect('/billing');
		}

		return (
			<div>
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
			</div>
		);
	});
}
