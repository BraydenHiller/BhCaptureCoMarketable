import "server-only";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId, runWithTenantScope } from "@/lib/requestScope";
import { notFound, redirect } from "next/navigation";
import { buildGalleryAccess } from "@/lib/galleryAccess";
import { requireMainDomain } from "@/lib/http/requireMainDomain";
import { requireTenantSession } from "@/lib/auth/requireTenantSession";

async function updateGallery(id: string, formData: FormData) {
	'use server';
	await requireMainDomain();
	const session = await requireTenantSession();
	return await runWithTenantScope(session.tenantId, async () => {
		const name = formData.get('name') as string;
		if (!name) throw new Error('Name is required');
		const accessMode = (formData.get('accessMode') as string) ?? 'PRIVATE';
		const clientUsername = formData.get('clientUsername') as string | null;
		const clientPassword = formData.get('clientPassword') as string | null;
		const tenantId = requireScopedTenantId();
		const db = getRequestDb();
		const existing = await db.gallery.findUnique({
			where: { id, tenantId },
			select: { clientPasswordHash: true },
		});
		if (!existing) throw new Error('Gallery not found');
		const access = await buildGalleryAccess({
			accessMode,
			clientUsername,
			clientPassword,
			existingPasswordHash: existing.clientPasswordHash,
			requirePassword: false,
		});
		await db.gallery.update({
			where: { id, tenantId },
			data: {
				name,
				accessMode: access.accessMode,
				clientUsername: access.clientUsername,
				clientPasswordHash: access.clientPasswordHash,
			},
		});
		redirect(`/galleries/${id}`);
	});
}

export default async function Page({ params }: { params: { id: string } }) {
	await requireMainDomain();
	const session = await requireTenantSession();
	return await runWithTenantScope(session.tenantId, async () => {
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
					<div>
						<label htmlFor="accessMode" className="block text-sm font-medium text-gray-700">Access Mode</label>
						<select
							id="accessMode"
							name="accessMode"
							defaultValue={gallery.accessMode}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="PRIVATE">PRIVATE</option>
							<option value="PUBLIC">PUBLIC</option>
						</select>
					</div>
					<div>
						<label htmlFor="clientUsername" className="block text-sm font-medium text-gray-700">Client Username (PRIVATE only)</label>
						<input
							type="text"
							id="clientUsername"
							name="clientUsername"
							defaultValue={gallery.clientUsername ?? ''}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						/>
					</div>
					<div>
						<label htmlFor="clientPassword" className="block text-sm font-medium text-gray-700">Client Password (PRIVATE only)</label>
						<input
							type="password"
							id="clientPassword"
							name="clientPassword"
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
