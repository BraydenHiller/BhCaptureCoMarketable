import "server-only";
import { prisma } from "./prisma";
import { requireScopedTenantId } from "@/lib/requestScope";

export function getRequestDb() {
	requireScopedTenantId();
	return prisma;
}
