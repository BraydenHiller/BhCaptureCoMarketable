import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

type Store = { tenantId: string };

const als = new AsyncLocalStorage<Store>();

export function runWithTenantScope<T>(tenantId: string, fn: () => T): T {
	return als.run({ tenantId }, fn);
}

export function getScopedTenantId(): string | null {
	const store = als.getStore();
	return store?.tenantId ?? null;
}

export function requireScopedTenantId(): string {
	const tenantId = getScopedTenantId();
	if (!tenantId) {
		throw new Error("Tenant scope is missing");
	}
	return tenantId;
}
