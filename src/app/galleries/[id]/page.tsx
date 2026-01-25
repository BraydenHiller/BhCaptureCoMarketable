import "server-only";
import Link from 'next/link';
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
				<div className="flex space-x-4">
					<Link href={`/galleries/${gallery.id}/edit`} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
						Edit
					</Link>
					<form action={`/galleries/${gallery.id}/delete`} method="post" className="inline">
						<button type="submit" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
							Delete
						</button>
					</form>
				</div>
			</div>
		);
	});
}
