import "server-only";
import Link from 'next/link';
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { notFound } from "next/navigation";
import { listPhotos } from "@/db/photo";

type PageProps = { params: Promise<{ id: string }> };

export default async function Page({ params }: PageProps) {
	const { id } = await params;
	return await withTenantRequestScope(async () => {
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();

		const gallery = await db.gallery.findUnique({
			where: { id, tenantId },
		});

		if (!gallery) {
			notFound();
		}

		const photos = await listPhotos(gallery.id);

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
				<div>
					<div className="flex justify-between items-center">
						<h2 className="text-xl font-semibold">Photos</h2>
						<Link href={`/galleries/${gallery.id}/photos/new`} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
							Add Photo
						</Link>
					</div>
					{photos.length === 0 ? (
						<p>No photos yet.</p>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
							{photos.map((photo) => (
								<div key={photo.id} className="border p-4 rounded">
									<p><strong>Alt:</strong> {photo.altText || 'N/A'}</p>
									<p><strong>Caption:</strong> {photo.caption || 'N/A'}</p>
									<p><strong>Sort:</strong> {photo.sortOrder}</p>
									<div className="flex space-x-2 mt-2">
										<Link href={`/galleries/${gallery.id}/photos/${photo.id}/edit`} className="text-blue-500 hover:underline">
											Edit
										</Link>
										<Link href={`/galleries/${gallery.id}/photos/${photo.id}/delete`} className="text-red-500 hover:underline">
											Delete
										</Link>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		);
	});
}
