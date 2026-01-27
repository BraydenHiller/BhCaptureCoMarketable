import { getSession } from './session';
import { redirect } from 'next/navigation';

type TenantSession = {
	sub: string;
	role: 'TENANT';
	tenantId: string;
	iat: number;
	exp: number;
};

export async function requireTenantSession(): Promise<TenantSession> {
	const session = await getSession();

	// No session or wrong role
	if (!session || session.role !== 'TENANT') {
		redirect('/login');
	}

	// Missing tenantId
	if (!session.tenantId) {
		redirect('/login');
	}

	return {
		sub: session.sub,
		role: session.role,
		tenantId: session.tenantId,
		iat: session.iat,
		exp: session.exp,
	};
}
