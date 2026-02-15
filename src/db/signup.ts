import { prisma } from './prisma';

export type CreateTenantSignupInput = {
	tenantName: string;
	tenantSlug: string;
	cognitoSub: string;
	email: string;
};

export async function createTenantSignup(
	input: CreateTenantSignupInput
): Promise<{ tenantId: string; userId: string }> {
	const existingTenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug },
	});

	if (existingTenant) {
		throw new Error('TENANT_SLUG_TAKEN');
	}

	const tenant = await prisma.tenant.create({
		data: {
			name: input.tenantName,
			slug: input.tenantSlug,
			status: 'ACTIVE',
			billingStatus: 'PENDING',
		},
	});

	const user = await prisma.user.create({
		data: {
			cognitoSub: input.cognitoSub,
			email: input.email,
			role: 'TENANT',
			status: 'ACTIVE',
			tenantId: tenant.id,
		},
	});

	return { tenantId: tenant.id, userId: user.id };
}
