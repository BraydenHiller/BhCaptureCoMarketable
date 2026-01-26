import { prisma } from "./prisma";
import type { User } from "@prisma/client";

export async function getTenantUserByCognitoSub(cognitoSub: string): Promise<User | null> {
	return prisma.user.findUnique({
		where: { cognitoSub },
	});
}

export function assertTenantUserIsValid(user: User): void {
	if (user.role !== "TENANT") {
		throw new Error("User is not a tenant user");
	}

	if (!user.tenantId) {
		throw new Error("User does not have a tenant assigned");
	}

	if (user.status !== "ACTIVE") {
		throw new Error("User account is not active");
	}
}
