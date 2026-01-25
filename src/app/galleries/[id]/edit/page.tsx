import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { notFound, redirect } from "next/navigation";

async function updateGallery(id: string, formData: FormData) {
	'use server';
	const name = formData.get('name') as string;
	if (!name) throw new Error('Name is required');
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	await db.gallery.update({
		where: { id, tenantId },
		data: { name },
	});
	redirect(`/galleries/${id}`);
}

export default async function Page({ params }: { params: { id: string } }) {
	return await withTenantRequestScope(async (tenantId) => {
		const db = getRequestDb();
		const gallery = await db.gallery.findUnique({
			where: { id: params.id },
		});

		if (!gallery) {
			notFound();
		}

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Edit Gallery</h1>
				<p className="text-sm text-gray-600">Tenant: {tenantId}</p>
				<form action={updateGallery.bind(null, params.id)} className="space-y-4">
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
						<input
							type="text"
							id="name"
							name="name"
							defaultValue={gallery.name}
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
					<button
						type="submit"
						className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Save
					</button>
				</form>
			</div>
		);
	});
}
