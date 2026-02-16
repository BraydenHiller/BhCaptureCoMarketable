import "server-only";
import { finalizePhotoUpload } from "@/lib/storage";
import { getPhoto } from "@/db/photo";
import { NextRequest, NextResponse } from "next/server";
import { requireMainDomain } from "@/lib/http/requireMainDomain";
import { requireTenantSession } from "@/lib/auth/requireTenantSession";
import { runWithTenantScope } from "@/lib/requestScope";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; photoId: string }> }) {
	await requireMainDomain();
	const session = await requireTenantSession();
	return await runWithTenantScope(session.tenantId, async () => {
		const { photoId } = await context.params;
		const photo = await getPhoto(photoId);
		if (!photo) {
			return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
		}
		const body = await request.json();
		await finalizePhotoUpload(photoId, body);
		return NextResponse.json({ ok: true });
	});
}
