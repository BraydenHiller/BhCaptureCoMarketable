import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getPhoto, updatePhoto } from "@/db/photo";
import { notFound, redirect } from "next/navigation";

async function updatePhotoAction(photoId: string, formData: FormData) {
	'use server';
	const altText = formData.get('altText') as string;
	const caption = formData.get('caption') as string;
	const sortOrder = parseInt(formData.get('sortOrder') as string, 10);
	await updatePhoto(photoId, { altText, caption, sortOrder });
	redirect(`/galleries/${formData.get('galleryId')}`);
}

export default async function Page({ params }: { params: Promise<{ id: string; photoId: string }> }) {
	return await withTenantRequestScope(async () => {
		const { id, photoId } = await params;
		const photo = await getPhoto(photoId);
		if (!photo) notFound();

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Edit Photo</h1>
				<form action={updatePhotoAction.bind(null, photoId)} className="space-y-4">
					<input type="hidden" name="galleryId" value={id} />
					<div>
						<label htmlFor="altText" className="block text-sm font-medium text-gray-700">Alt Text</label>
						<input
							type="text"
							id="altText"
							name="altText"
							defaultValue={photo.altText || ''}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>
					<div>
						<label htmlFor="caption" className="block text-sm font-medium text-gray-700">Caption</label>
						<input
							type="text"
							id="caption"
							name="caption"
							defaultValue={photo.caption || ''}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>
					<div>
						<label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700">Sort Order</label>
						<input
							type="number"
							id="sortOrder"
							name="sortOrder"
							defaultValue={photo.sortOrder}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>
					<button
						type="submit"
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
					>
						Save
					</button>
				</form>
			</div>
		);
	});
}
