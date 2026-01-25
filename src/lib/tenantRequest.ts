import 'server-only';
import { headers } from 'next/headers';
import { resolveTenantFromHost } from '@/lib/tenant';

export async function getRequestHost(): Promise<string | null> {
	const h = await headers();
	const xfh = h.get('x-forwarded-host') ?? '';
	if (xfh.trim()) {
		const first = xfh.split(',')[0].trim();
		return first || null;
	}
	const host = h.get('host') ?? '';
	return host.trim() || null;
}

function stripPort(host: string): string {
	if (!host) return host;
	// handle bracketed IPv6 like [::1]:3000 -> return [::1]
	if (host.startsWith('[')) {
		const end = host.indexOf(']');
		if (end !== -1) {
			return host.slice(0, end + 1);
		}
		return host;
	}
	// avoid stripping on IPv6 without brackets (many colons)
	const parts = host.split(':');
	if (parts.length === 2) {
		return parts[0];
	}
	return host;
}

export async function getRequestTenantId(): Promise<string | null> {
	const host = await getRequestHost();
	if (!host) return null;
	const hostNoPort = stripPort(host);
	return resolveTenantFromHost(hostNoPort);
}

export async function requireRequestTenantId(): Promise<string> {
	const host = await getRequestHost();
	const tenantId = await getRequestTenantId();
	if (!tenantId) {
		const hostLabel = host ?? 'unknown-host';
		throw new Error(`Tenant required for host: ${hostLabel}`);
	}
	return tenantId;
}
