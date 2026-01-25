import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { finalizePhotoUpload } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; photoId: string }> }) {
	return await withTenantRequestScope(async () => {
		const { photoId } = await context.params;
		const body = await request.json();
		await finalizePhotoUpload(photoId, body);
		return NextResponse.json({ ok: true });
	});
}
