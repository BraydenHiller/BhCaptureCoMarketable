import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	return await withTenantRequestScope(async () => {
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();

		const { id } = await context.params;

		try {
			await db.gallery.delete({
				where: { id, tenantId },
			});
		} catch {
			// Ignore errors (e.g., not found)
		}

		return NextResponse.redirect(new URL("/galleries", request.url));
	});
}
