import { requireMasterAdminSession } from '@/lib/auth/requireMasterAdminSession';
import { prisma } from '@/db/prisma';

export const dynamic = 'force-dynamic';

export default async function Page() {
	await requireMasterAdminSession();

	const tenants = await prisma.tenant.findMany({
		select: {
			id: true,
			slug: true,
			status: true,
			billingStatus: true,
			createdAt: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">All Tenants</h1>
			<table className="min-w-full border-collapse border border-gray-300">
				<thead>
					<tr className="bg-gray-100">
						<th className="border border-gray-300 px-4 py-2 text-left">ID</th>
						<th className="border border-gray-300 px-4 py-2 text-left">Slug</th>
						<th className="border border-gray-300 px-4 py-2 text-left">Status</th>
						<th className="border border-gray-300 px-4 py-2 text-left">Billing Status</th>
						<th className="border border-gray-300 px-4 py-2 text-left">Created At</th>
					</tr>
				</thead>
				<tbody>
					{tenants.map((tenant) => (
						<tr key={tenant.id}>
							<td className="border border-gray-300 px-4 py-2">{tenant.id}</td>
							<td className="border border-gray-300 px-4 py-2">{tenant.slug}</td>
							<td className="border border-gray-300 px-4 py-2">{tenant.status}</td>
							<td className="border border-gray-300 px-4 py-2">{tenant.billingStatus}</td>
							<td className="border border-gray-300 px-4 py-2">
								{tenant.createdAt.toISOString()}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
