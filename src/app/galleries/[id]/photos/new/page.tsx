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

		async function authorizeUpload(payload: {
			galleryId: string;
			uploadSizeBytes: number;
			mimeType: string;
			originalFilename: string;
		}) {
			'use server';
			return await withTenantRequestScope(async () => {
				const { galleryId, uploadSizeBytes, mimeType, originalFilename } = payload;
				if (!galleryId || !Number.isFinite(uploadSizeBytes)) {
					throw new Error('UPLOAD_SIZE_REQUIRED');
				}
				const scopedTenantId = requireScopedTenantId();
				const scopedDb = getRequestDb();
				const scopedGallery = await scopedDb.gallery.findUnique({
					where: { id: galleryId, tenantId: scopedTenantId },
				});
				if (!scopedGallery) {
					throw new Error('GALLERY_NOT_FOUND');
				}
				const result = await preparePhotoUpload(galleryId, {
					uploadSizeBytes,
					mimeType,
					originalFilename,
				});
				return {
					uploadUrl: result.uploadUrl,
					photoId: result.photoId,
					storageKey: result.storageKey,
				};
			});
		}
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Add Photo</h1>
				<PhotoUploadForm galleryId={id} requestUpload={authorizeUpload} />
			</div>
		);
	});
}
