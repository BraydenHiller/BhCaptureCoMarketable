import { getSession } from './session';
import { redirect } from 'next/navigation';

type TenantSession = {
	sub: string;
	role: 'TENANT';
	tenantId: string;
	iat: number;
	exp: number;
};

type ActiveTenantSession = TenantSession & {
	tenant: { id: string; status: string; billingStatus: string };
};

async function getActiveTenantFromSession(): Promise<ActiveTenantSession> {
	const session = await getSession();

	// No session or wrong role
	if (!session || session.role !== 'TENANT') {
		redirect('/login');
	}

	// Missing tenantId
	if (!session.tenantId) {
		redirect('/login');
	}

	const { prisma } = await import('../../db/prisma');
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
	});

	if (!tenant || tenant.status !== 'ACTIVE') {
		redirect('/login');
	}

	return {
		sub: session.sub,
		role: session.role,
		tenantId: session.tenantId,
		iat: session.iat,
		exp: session.exp,
		tenant: {
			id: tenant.id,
			status: tenant.status,
			billingStatus: tenant.billingStatus,
		},
	};
}

export async function requireTenantSession(): Promise<TenantSession> {
	const session = await getActiveTenantFromSession();

	if (session.tenant.billingStatus !== 'ACTIVE') {
		redirect('/billing');
	}

	return {
		sub: session.sub,
		role: session.role,
		tenantId: session.tenantId,
		iat: session.iat,
		exp: session.exp,
	};
}

export async function requireTenantSessionAllowUnpaid(): Promise<TenantSession> {
	const session = await getActiveTenantFromSession();

	return {
		sub: session.sub,
		role: session.role,
		tenantId: session.tenantId,
		iat: session.iat,
		exp: session.exp,
	};
}
