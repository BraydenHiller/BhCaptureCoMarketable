import Link from 'next/link';
import { getRequestDb } from '@/db/requestDb';
import { getScopedTenantId } from '@/lib/requestScope';

export default async function Page() {
	// Read tenant from request scope established by the /galleries layout
	const tenantId = getScopedTenantId();

	// If scope is missing, render a neutral message (layout should have enforced scope)
	if (!tenantId) {
		return (
			<div>
				<h1>Galleries</h1>
				<p>Tenant context is unavailable.</p>
			</div>
		);
	}

	const db = getRequestDb();

	const galleries = await db.gallery.findMany({
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
}
