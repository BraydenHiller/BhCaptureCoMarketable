import { NextRequest, NextResponse } from "next/server";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid } from "@/lib/galleryClientAuth";
import {
	addPhotoToSelection,
	removePhotoFromSelection,
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

function mapDbError(err: unknown): NextResponse {
	const msg = err instanceof Error ? err.message : "";
	if (msg === "Photo not found") {
		return NextResponse.json({ error: "PHOTO_NOT_FOUND" }, { status: 404 });
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

async function handleItemsRoute(
	request: NextRequest,
	galleryId: string,
	operation: "add" | "remove",
) {
	return withTenantRequestScope(async () => {
		const tenantId = requireScopedTenantId();
		const session = await getClientGallerySession();
		if (!isClientSessionValid(session, tenantId, galleryId)) {
			return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
		}

		const contentType = request.headers.get("content-type") ?? "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
		}

		const body = (await request.json()) as { photoId?: string };
		const photoId = body.photoId;
		if (!photoId || typeof photoId !== "string") {
			return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
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
			const result =
				operation === "add"
					? await addPhotoToSelection(galleryId, gallery.clientUsername, photoId)
					: await removePhotoFromSelection(galleryId, gallery.clientUsername, photoId);
			return NextResponse.json(formatSelection(result as Parameters<typeof formatSelection>[0]));
		} catch (err) {
			return mapDbError(err);
		}
	});
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: galleryId } = await params;
	return handleItemsRoute(request, galleryId, "add");
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: galleryId } = await params;
	return handleItemsRoute(request, galleryId, "remove");
}
