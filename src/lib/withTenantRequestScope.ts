import "server-only";
import { requireRequestTenantId } from "@/lib/tenantRequest";
import { runWithTenantScope } from "@/lib/requestScope";

export async function withTenantRequestScope<T>(fn: (tenantId: string) => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: () => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: ((tenantId: string) => Promise<T>) | (() => Promise<T>)): Promise<T> {
	const tenantId = await requireRequestTenantId();
	return runWithTenantScope(tenantId, () => {
		if (fn.length === 0) {
			return (fn as () => Promise<T>)();
		} else {
			return (fn as (tenantId: string) => Promise<T>)(tenantId);
		}
	});
}
