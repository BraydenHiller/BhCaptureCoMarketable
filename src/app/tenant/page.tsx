import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestHost } from "@/lib/tenantRequest";
import { getScopedTenantId } from "@/lib/requestScope";
import { getRequestDb } from "@/db/requestDb";

export default async function Page() {
	return await withTenantRequestScope(async (tenantId) => {
		const host = await getRequestHost();
		const scopedTenantId = getScopedTenantId();
		const db = getRequestDb();

		let dbResult: string;
		try {
			const result = await db.$queryRaw`SELECT 1 as ok`;
			dbResult = JSON.stringify(result);
		} catch (error) {
			dbResult = error instanceof Error ? `Error: ${error.message}` : "Unknown error";
		}

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Tenant Page</h1>
				<p><strong>Host:</strong> {host ?? 'N/A'}</p>
				<p><strong>Tenant (callback):</strong> {tenantId}</p>
				<p><strong>Tenant (scope):</strong> {scopedTenantId ?? 'N/A'}</p>
				<p><strong>DB check:</strong> {dbResult}</p>
			</div>
		);
	});
}
