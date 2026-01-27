import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function stripPort(host: string): string {
	if (!host) return host;
	// Handle bracketed IPv6 like [::1]:3000
	if (host.startsWith('[')) {
		const end = host.indexOf(']');
		if (end !== -1) {
			return host.slice(0, end + 1);
		}
		return host;
	}
	// Strip port for typical hosts
	const parts = host.split(':');
	if (parts.length === 2) {
		return parts[0];
	}
	return host;
}

export async function requireMainDomain(): Promise<void> {
	const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
	if (!mainDomain) {
		throw new Error('NEXT_PUBLIC_MAIN_DOMAIN is required');
	}

	const h = await headers();
	const host = h.get('host');
	if (!host) {
		throw new Error('Host header missing');
	}

	const normalizedHost = stripPort(host).toLowerCase();
	const normalizedMain = stripPort(mainDomain).toLowerCase();

	if (normalizedHost !== normalizedMain) {
		// Redirect to main domain with same path
		const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
		const currentPath = h.get('x-invoke-path') || '/app';
		redirect(`${proto}://${mainDomain}${currentPath}`);
	}
}
