import "server-only";
import { requireRequestTenantId } from "@/lib/tenantRequest";
import { runWithTenantScope, getScopedTenantId } from "@/lib/requestScope";
import { requireTenantSessionAllowUnpaid } from "@/lib/auth/requireTenantSession";

export async function withTenantRequestScope<T>(fn: (tenantId: string) => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: () => Promise<T>): Promise<T>;
export async function withTenantRequestScope<T>(fn: ((tenantId: string) => Promise<T>) | (() => Promise<T>)): Promise<T> {
	// Resolve tenantId with fallback chain:
	// 1) Scoped tenantId (from async local storage, e.g., session context)
	// 2) Tenant session (from requireTenantSessionAllowUnpaid)
	// 3) Host-based resolution (from requireRequestTenantId)
	let tenantId: string | undefined;

	// Try scoped tenantId first
	const scopedTenantId = getScopedTenantId();
	if (scopedTenantId) {
		tenantId = scopedTenantId;
	}

	// Try tenant session if scoped is unavailable
	if (!tenantId) {
		try {
			const session = await requireTenantSessionAllowUnpaid();
			tenantId = session.tenantId;
		} catch {
			// Session unavailable, continue to host-based fallback
		}
	}

	// Fall back to host-based resolution
	if (!tenantId) {
		tenantId = await requireRequestTenantId();
	}

	return runWithTenantScope(tenantId, () => {
		if (fn.length === 0) {
			return (fn as () => Promise<T>)();
		} else {
			return (fn as (tenantId: string) => Promise<T>)(tenantId);
		}
	});
}
