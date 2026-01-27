import Link from 'next/link';
import { getRequestDb } from '@/db/requestDb';
import { requireScopedTenantId, runWithTenantScope } from '@/lib/requestScope';
import { requireMainDomain } from '@/lib/http/requireMainDomain';
import { requireTenantSession } from '@/lib/auth/requireTenantSession';

export default async function Page() {
	await requireMainDomain();
	const session = await requireTenantSession();

	return runWithTenantScope(session.tenantId, async () => {
		const tenantId = requireScopedTenantId();
		const db = getRequestDb();

		const galleries = await db.gallery.findMany({
			where: { tenantId },
			orderBy: { createdAt: 'desc' },
		});

		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h1 className="text-2xl font-bold">Galleries</h1>
					<Link href="/galleries/new" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
						New Gallery
					</Link>
				</div>
				<div className="text-sm text-gray-600 space-y-1">
					<p><strong>Tenant (scope):</strong> {tenantId}</p>
				</div>
				{galleries.length === 0 ? (
					<p>No galleries yet.</p>
				) : (
					<ul className="space-y-2">
						{galleries.map((gallery) => (
							<li key={gallery.id} className="border p-2 rounded">
								<Link href={`/galleries/${gallery.id}`} className="text-blue-500 hover:underline">
									{gallery.name}
								</Link>{' '}
								- {gallery.createdAt.toLocaleString()}
							</li>
						))}
					</ul>
				)}
			</div>
		);
	});
}
