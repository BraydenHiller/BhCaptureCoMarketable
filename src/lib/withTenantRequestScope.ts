import "server-only";
import { requireRequestTenantId } from "@/lib/tenantRequest";
import { runWithTenantScope, getScopedTenantId } from "@/lib/requestScope";

export async function withTenantRequestScope<T>(fn: (tenantId: string) => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: () => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: ((tenantId: string) => Promise<T>) | (() => Promise<T>)): Promise<T> {
	// Prefer request-scoped tenantId (e.g., from session) before falling back to host-based resolution
	const scopedTenantId = getScopedTenantId();
	const tenantId = scopedTenantId ?? (await requireRequestTenantId());
	return runWithTenantScope(tenantId, () => {
		if (fn.length === 0) {
			return (fn as () => Promise<T>)();
		} else {
			return (fn as (tenantId: string) => Promise<T>)(tenantId);
		}
	});
}
