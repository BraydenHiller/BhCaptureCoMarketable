import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireMasterAdminSession();

	return <>{children}</>;
}
