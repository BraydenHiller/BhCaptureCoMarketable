import { NextResponse } from "next/server";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid } from "@/lib/galleryClientAuth";
import { generateDownloadUrl } from "@/lib/storage/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  return withTenantRequestScope(async () => {
    const { id: galleryId, photoId } = await params;
    const tenantId = requireScopedTenantId();
    const db = getRequestDb();

    const session = await getClientGallerySession();
    if (!isClientSessionValid(session, tenantId, galleryId)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const gallery = await db.gallery.findFirst({
      where: { id: galleryId, tenantId },
      select: { id: true, clientUsername: true },
    });
    if (!gallery) {
      return NextResponse.json({ error: "GALLERY_NOT_FOUND" }, { status: 404 });
    }
    if (!gallery.clientUsername) {
      return NextResponse.json({ error: "CLIENT_USERNAME_REQUIRED" }, { status: 400 });
    }

    const entitlement = await db.downloadEntitlement.findFirst({
      where: {
        tenantId,
        galleryId,
        clientUsername: gallery.clientUsername,
        photoId,
        status: "ACTIVE",
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        photo: { select: { storageKey: true } },
      },
    });

    if (!entitlement || !entitlement.photo?.storageKey) {
      return NextResponse.json({ error: "NOT_ENTITLED" }, { status: 403 });
    }

    const url = await generateDownloadUrl(entitlement.photo.storageKey);
    return NextResponse.json({ url });
  });
}
