import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { prisma } from '@/db/prisma';

export const dynamic = 'force-dynamic';

export default async function Page() {
	const session = await requireTenantSession();
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			storageUsedBytes: true,
			storageLimitBytes: true,
			storageEnforced: true,
		},
	});

	if (!tenant) {
		throw new Error('Tenant not found');
	}

	const remainingBytes = tenant.storageLimitBytes - tenant.storageUsedBytes;
	const clampedRemaining = remainingBytes > BigInt(0) ? remainingBytes : BigInt(0);
	const percentUsed = tenant.storageLimitBytes > BigInt(0)
		? Math.min(
			100,
			Math.floor(
				(Number(tenant.storageUsedBytes) / Number(tenant.storageLimitBytes)) * 100
			)
		)
		: 0;

	return (
		<div>
			<h2>Dashboard</h2>
			<div className="mt-4 space-y-2">
				<h3 className="text-lg font-semibold">Storage</h3>
				<p>Used: {tenant.storageUsedBytes.toString()} bytes</p>
				<p>Limit: {tenant.storageLimitBytes.toString()} bytes</p>
				<p>Remaining: {clampedRemaining.toString()} bytes</p>
				<p>Percent used: {percentUsed}%</p>
				<p>Enforced: {tenant.storageEnforced ? 'true' : 'false'}</p>
			</div>
		</div>
	);
}
