import { TenantDomainStatus } from '@prisma/client';
import { prisma } from '../db/prisma';

export type TenantContext = { tenantId: string; tenantSlug: string };

export function resolveTenantFromHost(host: string): string | null {
	if (!host) return null;

	let hostOnly = host;

	// Handle bracketed IPv6 like [::1]:3000
	if (hostOnly.startsWith('[')) {
		const end = hostOnly.indexOf(']');
		if (end !== -1) {
			hostOnly = hostOnly.slice(1, end);
		}
	} else {
		// Remove port for typical hosts (tenant.example.com:3000 -> tenant.example.com)
		hostOnly = hostOnly.split(':')[0];
	}

	hostOnly = hostOnly.toLowerCase().trim();

	// Reject localhost
	if (hostOnly === 'localhost') return null;

	// Reject IPv4
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostOnly)) return null;

	// Reject raw IPv6
	if (hostOnly.includes(':')) return null;

	// Need at least one dot to have a subdomain
	const firstDot = hostOnly.indexOf('.');
	if (firstDot <= 0) return null;

	const subdomain = hostOnly.slice(0, firstDot);

	// Validate subdomain label
	if (!/^[a-z0-9-]+$/.test(subdomain)) return null;

	return subdomain;
}

export async function requireTenantContext(input: { host?: string; headers?: Headers }): Promise<TenantContext> {
	const rawHost = input.host ?? input.headers?.get('host') ?? undefined;
	if (!rawHost) {
		throw new Error('Tenant required');
	}

	let normalizedHost = rawHost.trim().toLowerCase();
	if (normalizedHost.startsWith('[')) {
		const end = normalizedHost.indexOf(']');
		if (end !== -1) {
			normalizedHost = normalizedHost.slice(1, end);
		}
	} else {
		normalizedHost = normalizedHost.split(':')[0];
	}

	normalizedHost = normalizedHost.trim().toLowerCase();
	if (!normalizedHost) {
		throw new Error('Tenant required');
	}

	const domainMatch = await prisma.tenantDomain.findUnique({
		where: { hostname: normalizedHost },
		select: { tenant: { select: { id: true, slug: true } }, status: true },
	});

	if (domainMatch && domainMatch.status !== TenantDomainStatus.DISABLED) {
		if (!domainMatch.tenant) {
			throw new Error('Tenant not found');
		}
		return { tenantId: domainMatch.tenant.id, tenantSlug: domainMatch.tenant.slug };
	}

	const tenantSlug = resolveTenantFromHost(normalizedHost);
	if (!tenantSlug) {
		throw new Error('Tenant required');
	}

	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug },
		select: { id: true, slug: true },
	});

	if (!tenant || !tenant.slug) {
		throw new Error('Tenant not found');
	}

	return { tenantId: tenant.id, tenantSlug: tenant.slug };
}
