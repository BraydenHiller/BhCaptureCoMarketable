import { requireTenantSession } from '@/lib/auth/requireTenantSession';
import { prisma } from '@/db/prisma';
import { headers } from 'next/headers';
import { env } from '@/lib/env';

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

	const hdrs = await headers();
	const forwardedProto = hdrs.get('x-forwarded-proto');
	const forwardedHost = hdrs.get('x-forwarded-host');
	const host = forwardedHost ?? hdrs.get('host');
	const baseUrl = forwardedProto && forwardedHost
		? `${forwardedProto}://${forwardedHost}`
		: host
			? `http://${host}`
			: env.NEXT_PUBLIC_APP_URL;

	let domainStatus: {
		connected: boolean;
		hostname?: string;
		status?: string;
		txtRecordName?: string;
		txtRecordValue?: string;
		verifiedAt?: string | null;
		activatedAt?: string | null;
		disabledAt?: string | null;
		createdAt?: string;
		updatedAt?: string;
	} | null = null;

	try {
		const response = await fetch(`${baseUrl}/api/tenant-domain/status`, { cache: 'no-store' });
		if (response.ok) {
			domainStatus = await response.json();
		}
	} catch {
		domainStatus = null;
	}

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
			<div className="mt-6 space-y-2">
				<h3 className="text-lg font-semibold">Custom Domain</h3>
				{domainStatus?.connected ? (
					<div className="space-y-2">
						<p>Hostname: {domainStatus.hostname}</p>
						<p>Status: {domainStatus.status}</p>
						{domainStatus.status === 'PENDING_VERIFICATION' ? (
							<div className="space-y-1">
								<p>TXT Record Name: {domainStatus.txtRecordName}</p>
								<p>TXT Record Value: {domainStatus.txtRecordValue}</p>
							</div>
						) : null}
						<form action="/api/tenant-domain/remove" method="post">
							<button type="submit" className="border px-3 py-1 rounded">
								Remove Domain
							</button>
						</form>
					</div>
				) : (
					<div className="space-y-2">
						<p>No custom domain connected.</p>
						<form action="/api/tenant-domain/start" method="post" className="space-y-2">
							<input
								type="text"
								name="hostname"
								placeholder="example.com"
								className="border px-2 py-1 rounded w-full max-w-sm"
							/>
							<button type="submit" className="border px-3 py-1 rounded">
								Connect Domain
							</button>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}
