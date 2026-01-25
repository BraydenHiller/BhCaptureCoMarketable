import "server-only";
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
				<h1 className="text-2xl font-bold">Galleries</h1>
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
