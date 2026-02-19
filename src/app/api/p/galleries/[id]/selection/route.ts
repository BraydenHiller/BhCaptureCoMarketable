import { NextRequest, NextResponse } from "next/server";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid } from "@/lib/galleryClientAuth";
import {
	getSelectionWithItems,
	createOrGetDraftSelection,
} from "@/db/selection";

function formatSelection(sel: {
	id: string;
	status: string;
	submittedAt: Date | null;
	items: { id: string; photoId: string; note: string | null }[];
}) {
	return {
		id: sel.id,
		status: sel.status,
		submittedAt: sel.submittedAt,
		items: sel.items.map((i) => ({ id: i.id, photoId: i.photoId, note: i.note ?? null })),
	};
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: galleryId } = await params;

	return withTenantRequestScope(async () => {
		const tenantId = requireScopedTenantId();
		const session = await getClientGallerySession();
		if (!isClientSessionValid(session, tenantId, galleryId)) {
			return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
		}

		const db = getRequestDb();
		const gallery = await db.gallery.findFirst({
			where: { id: galleryId, tenantId },
			select: { id: true, accessMode: true, clientUsername: true },
		});
		if (!gallery) {
			return NextResponse.json({ error: "GALLERY_NOT_FOUND" }, { status: 404 });
		}
		if (gallery.accessMode !== "PRIVATE") {
			return NextResponse.json({ error: "GALLERY_NOT_PRIVATE" }, { status: 400 });
		}
		if (!gallery.clientUsername) {
			return NextResponse.json({ error: "CLIENT_USERNAME_REQUIRED" }, { status: 400 });
		}

		let selection = await getSelectionWithItems(galleryId, gallery.clientUsername);
		if (!selection) {
			selection = await createOrGetDraftSelection(galleryId, gallery.clientUsername);
		}

		return NextResponse.json(formatSelection(selection as Parameters<typeof formatSelection>[0]));
	});
}
