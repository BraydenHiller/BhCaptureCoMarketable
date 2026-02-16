import { TenantDomainStatus } from "@prisma/client";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getRequestDb } from "./requestDb";
import { prisma } from "./prisma";

type CreateOrResetTenantDomainInput = {
	hostname: string;
	verificationToken: string;
	txtRecordName: string;
	txtRecordValue: string;
};

export async function getTenantDomain() {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.tenantDomain.findUnique({
		where: { tenantId },
	});
}

export async function createOrResetTenantDomain(input: CreateOrResetTenantDomainInput) {
	const tenantId = requireScopedTenantId();
	const db = getRequestDb();
	return db.tenantDomain.upsert({
		where: { tenantId },
		update: {
			hostname: input.hostname,
			status: TenantDomainStatus.PENDING_VERIFICATION,
			verificationToken: input.verificationToken,
			txtRecordName: input.txtRecordName,
			txtRecordValue: input.txtRecordValue,
			verifiedAt: null,
			activatedAt: null,
			disabledAt: null,
		},
		create: {
			tenantId,
			hostname: input.hostname,
			status: TenantDomainStatus.PENDING_VERIFICATION,
			verificationToken: input.verificationToken,
			txtRecordName: input.txtRecordName,
			txtRecordValue: input.txtRecordValue,
		},
	});
}

export async function markTenantDomainVerified(tenantId: string, hostname: string) {
	return prisma.tenantDomain.updateMany({
		where: { tenantId, hostname },
		data: {
			status: TenantDomainStatus.VERIFIED,
			verifiedAt: new Date(),
			disabledAt: null,
		},
	});
}

export async function setTenantDomainStatusActive(tenantId: string) {
	return prisma.tenantDomain.update({
		where: { tenantId },
		data: {
			status: TenantDomainStatus.ACTIVE,
			activatedAt: new Date(),
		},
	});
}

export async function disableTenantDomain(tenantId: string) {
	return prisma.tenantDomain.update({
		where: { tenantId },
		data: {
			status: TenantDomainStatus.DISABLED,
			disabledAt: new Date(),
		},
	});
}
