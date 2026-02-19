import { NextRequest, NextResponse } from "next/server";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid } from "@/lib/galleryClientAuth";
import { submitSelection } from "@/db/selection";

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

export async function POST(
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

		try {
			const result = await submitSelection(galleryId, gallery.clientUsername);
			return NextResponse.json(formatSelection(result as Parameters<typeof formatSelection>[0]));
		} catch (err) {
			const msg = err instanceof Error ? err.message : "";
			if (msg === "Selection exceeds max selections") {
				return NextResponse.json({ error: "MAX_SELECTIONS_EXCEEDED" }, { status: 409 });
			}
			if (msg === "Selection is submitted") {
				return NextResponse.json({ error: "SELECTION_SUBMITTED" }, { status: 409 });
			}
			if (msg === "Gallery is not private") {
				return NextResponse.json({ error: "GALLERY_NOT_PRIVATE" }, { status: 400 });
			}
			if (msg === "Gallery not found") {
				return NextResponse.json({ error: "GALLERY_NOT_FOUND" }, { status: 404 });
			}
			throw err;
		}
	});
}
