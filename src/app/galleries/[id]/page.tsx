import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
	return await withTenantRequestScope(async () => {
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();

		const gallery = await db.gallery.findUnique({
			where: { id: params.id, tenantId },
		});

		if (!gallery) {
			notFound();
		}

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">{gallery.name}</h1>
				<p><strong>ID:</strong> {gallery.id}</p>
				<p><strong>Created:</strong> {gallery.createdAt.toLocaleString()}</p>
			</div>
		);
	});
}
