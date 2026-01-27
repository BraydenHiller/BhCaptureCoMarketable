import "server-only";
import { redirect } from "next/navigation";
import { getRequestDb } from "@/db/requestDb";
import { requireMainDomain } from "@/lib/http/requireMainDomain";
import { requireTenantSession } from "@/lib/auth/requireTenantSession";
import { requireScopedTenantId, runWithTenantScope } from "@/lib/requestScope";

async function createGallery(formData: FormData) {
	"use server";
	const session = await requireTenantSession();

	return runWithTenantScope(session.tenantId, async () => {
		const name = formData.get("name") as string;
		if (!name) throw new Error("Name required");

		const tenantId = requireScopedTenantId();
		const db = getRequestDb();

		await db.gallery.create({ data: { name, tenantId } });
		redirect("/galleries");
	});
}

export default async function Page() {
	await requireMainDomain();
	const session = await requireTenantSession();

	return runWithTenantScope(session.tenantId, async () => (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Create Gallery</h1>
			<form action={createGallery} className="space-y-4">
				<div>
					<label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
					/>
				</div>
				<button
					type="submit"
					className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					Create Gallery
				</button>
			</form>
		</div>
	));
}
