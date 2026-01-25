import "server-only";
import Link from 'next/link';
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getPhoto, deletePhoto } from "@/db/photo";
import { notFound, redirect } from "next/navigation";

async function deletePhotoAction(galleryId: string, photoId: string) {
	'use server';
	await deletePhoto(photoId);
	redirect(`/galleries/${galleryId}`);
}

export default async function Page({ params }: { params: Promise<{ id: string; photoId: string }> }) {
	return await withTenantRequestScope(async () => {
		const { id, photoId } = await params;
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();
		const gallery = await db.gallery.findUnique({
			where: { id, tenantId },
		});
		if (!gallery) {
			notFound();
		}
		const photo = await getPhoto(photoId);
		if (!photo) notFound();

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Delete Photo</h1>
				<p>Are you sure you want to delete this photo?</p>
				<p><strong>Alt:</strong> {photo.altText || 'N/A'}</p>
				<p><strong>Caption:</strong> {photo.caption || 'N/A'}</p>
				<div className="flex space-x-4">
					<Link href={`/galleries/${id}`} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
						Cancel
					</Link>
					<form action={deletePhotoAction.bind(null, id, photoId)} className="inline">
						<button type="submit" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
							Delete
						</button>
					</form>
				</div>
			</div>
		);
	});
}
