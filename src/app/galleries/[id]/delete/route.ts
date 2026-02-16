import "server-only";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId, runWithTenantScope } from "@/lib/requestScope";
import { NextRequest, NextResponse } from "next/server";
import { requireMainDomain } from "@/lib/http/requireMainDomain";
import { requireTenantSession } from "@/lib/auth/requireTenantSession";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	await requireMainDomain();
	const session = await requireTenantSession();
	return await runWithTenantScope(session.tenantId, async () => {
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
