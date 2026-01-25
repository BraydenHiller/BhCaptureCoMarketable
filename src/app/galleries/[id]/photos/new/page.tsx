import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { preparePhotoUpload } from "@/lib/storage";
import { notFound } from "next/navigation";
import PhotoUploadForm from "@/components/PhotoUploadForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	return await withTenantRequestScope(async () => {
		const { id } = await params;
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();
		const gallery = await db.gallery.findUnique({
			where: { id, tenantId },
		});
		if (!gallery) {
			notFound();
		}
		const { photo, uploadUrl } = await preparePhotoUpload(id, {});
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Add Photo</h1>
				<PhotoUploadForm uploadUrl={uploadUrl} photoId={photo.id} galleryId={id} />
			</div>
		);
	});
}
