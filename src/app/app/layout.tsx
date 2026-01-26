import { getSession } from '@/lib/auth/session';
import { runWithTenantScope } from '@/lib/requestScope';
import { redirect } from 'next/navigation';

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Get authenticated session
	const session = await getSession();

	// Require TENANT role
	if (!session || session.role !== 'TENANT') {
		redirect('/login');
	}

	// Require tenantId in session
	if (!session.tenantId) {
		redirect('/login');
	}

	// Establish request-scoped tenant context from session
	// This injects tenantId into the request scope for all child pages/components
	return runWithTenantScope(session.tenantId, () => (
		<>{children}</>
	));
}
