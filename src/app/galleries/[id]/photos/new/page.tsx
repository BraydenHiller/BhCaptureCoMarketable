import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { preparePhotoUpload } from "@/lib/storage";
import PhotoUploadForm from "@/components/PhotoUploadForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	return await withTenantRequestScope(async () => {
		const { id } = await params;
		const { photo, uploadUrl } = await preparePhotoUpload(id, {});
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Add Photo</h1>
				<PhotoUploadForm uploadUrl={uploadUrl} photoId={photo.id} galleryId={id} />
			</div>
		);
	});
}
