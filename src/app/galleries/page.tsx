import "server-only";
import Link from 'next/link';
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestHost } from "@/lib/tenantRequest";
import { getScopedTenantId } from "@/lib/requestScope";
import { getRequestDb } from "@/db/requestDb";

export default async function Page() {
	return await withTenantRequestScope(async (tenantId) => {
		const host = await getRequestHost();
		const scopedTenantId = getScopedTenantId();
		const db = getRequestDb();

		const galleries = await db.gallery.findMany({
			orderBy: { createdAt: "desc" },
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
					<p><strong>Host:</strong> {host ?? 'N/A'}</p>
					<p><strong>Tenant (callback):</strong> {tenantId}</p>
					<p><strong>Tenant (scope):</strong> {scopedTenantId ?? 'N/A'}</p>
				</div>
				{galleries.length === 0 ? (
					<p>No galleries yet.</p>
				) : (
					<ul className="space-y-2">
						{galleries.map((gallery) => (
							<li key={gallery.id} className="border p-2 rounded">
								{gallery.name} - {gallery.createdAt.toLocaleString()}
							</li>
						))}
					</ul>
				)}
			</div>
		);
	});
}
