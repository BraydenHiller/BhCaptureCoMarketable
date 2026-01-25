import "server-only";
import { requireRequestTenantId } from "@/lib/tenantRequest";
import { runWithTenantScope } from "@/lib/requestScope";

export async function withTenantRequestScope<T>(fn: (tenantId: string) => Promise<T>): Promise<T> {
	const tenantId = await requireRequestTenantId();
	return runWithTenantScope(tenantId, () => fn(tenantId));
}
