export async function withTenant<T>(tenantId: string, fn: (tenantId: string) => Promise<T>): Promise<T> {
	if (!tenantId) {
		throw new Error('tenantId is required');
	}
	return await fn(tenantId);
}
