import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestHost, getRequestTenantId } from "@/lib/tenantRequest";
import { getScopedTenantId } from "@/lib/requestScope";

export default async function Page() {
	return await withTenantRequestScope(async (tenantId) => {
		const host = await getRequestHost();
		const tenantFromRequest = await getRequestTenantId();
		const tenantFromScope = getScopedTenantId();

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">Home</h1>
				<p>
					<strong>Host:</strong> {host ?? "N/A"}
				</p>
				<p>
					<strong>Tenant (request):</strong> {tenantFromRequest ?? "N/A"}
				</p>
				<p>
					<strong>Tenant (scope):</strong> {tenantFromScope ?? "N/A"}
				</p>
				<p>
					<strong>Tenant (callback):</strong> {tenantId}
				</p>
				<p className="text-gray-600">UI foundation is live</p>
			</div>
		);
	});
}
