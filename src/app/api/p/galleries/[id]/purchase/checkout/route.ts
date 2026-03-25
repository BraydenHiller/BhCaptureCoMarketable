import { NextRequest, NextResponse } from "next/server";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { getClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid } from "@/lib/galleryClientAuth";
import { createPendingPurchase } from "@/db/purchase";
import { getStripe } from "@/lib/stripe";
import { getRequestBaseUrl } from "@/lib/http/baseUrl";

type PurchaseItem = {
	id: string;
	photoId: string;
	priceInCents: number;
	photo: { originalFilename: string | null };
};

type PurchaseResult = {
	id: string;
	status: string;
	totalInCents: number;
	platformFeeInCents: number;
	items: PurchaseItem[];
};

function formatPurchase(purchase: PurchaseResult) {
	return {
		id: purchase.id,
		status: purchase.status,
		totalInCents: purchase.totalInCents,
		platformFeeInCents: purchase.platformFeeInCents,
		items: purchase.items.map((i) => ({
			id: i.id,
			photoId: i.photoId,
			priceInCents: i.priceInCents,
		})),
	};
}

function mapDbError(err: unknown): NextResponse | null {
	const msg = err instanceof Error ? err.message : "";
	if (msg === "Gallery not found") {
		return NextResponse.json({ error: "GALLERY_NOT_FOUND" }, { status: 404 });
	}
	if (msg === "Purchasing is not enabled for this gallery") {
		return NextResponse.json({ error: "PURCHASE_NOT_ENABLED" }, { status: 403 });
	}
	if (msg === "At least one photo is required" || msg === "Duplicate photo IDs") {
		return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
	}
	if (msg === "One or more photos not found in gallery") {
		return NextResponse.json({ error: "PHOTO_NOT_FOUND" }, { status: 404 });
	}
	if (msg === "One or more photos do not have a price") {
		return NextResponse.json({ error: "PHOTO_NOT_PRICED" }, { status: 422 });
	}
	return null;
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: galleryId } = await params;

	return withTenantRequestScope(async () => {
		const tenantId = requireScopedTenantId();
		const clientSession = await getClientGallerySession();
		if (!isClientSessionValid(clientSession, tenantId, galleryId)) {
			return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
		}

		const contentType = request.headers.get("content-type") ?? "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
		}

		const body = (await request.json()) as { photoIds?: unknown };
		const { photoIds } = body;
		if (
			!Array.isArray(photoIds) ||
			photoIds.length === 0 ||
			!photoIds.every((id) => typeof id === "string" && id.length > 0)
		) {
			return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
		}

		const db = getRequestDb();
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

		let purchase: PurchaseResult;
		try {
			purchase = await createPendingPurchase({
				galleryId,
				clientUsername: gallery.clientUsername,
				photoIds: photoIds as string[],
			}) as PurchaseResult;
		} catch (err) {
			const mapped = mapDbError(err);
			if (mapped) return mapped;
			throw err;
		}

		const tenant = await db.tenant.findUnique({
			where: { id: tenantId },
			select: { stripeAccountId: true },
		});
		if (!tenant?.stripeAccountId) {
			return NextResponse.json({ error: "STRIPE_NOT_CONNECTED" }, { status: 422 });
		}

		const baseUrl = getRequestBaseUrl(request);
		const stripe = getStripe();
		const checkoutSession = await stripe.checkout.sessions.create(
			{
				mode: "payment",
				line_items: purchase.items.map((item) => ({
					price_data: {
						currency: "usd",
						unit_amount: item.priceInCents,
						product_data: {
							name: item.photo.originalFilename ?? `Photo ${item.photoId.slice(0, 8)}`,
						},
					},
					quantity: 1,
				})),
				payment_intent_data: {
					application_fee_amount: purchase.platformFeeInCents,
				},
				metadata: { purchaseId: purchase.id },
				success_url: `${baseUrl}/p/galleries/${galleryId}?purchase=success`,
				cancel_url: `${baseUrl}/p/galleries/${galleryId}?purchase=cancel`,
			},
			{ stripeAccount: tenant.stripeAccountId },
		);

		return NextResponse.json({
			...formatPurchase(purchase),
			checkoutUrl: checkoutSession.url ?? null,
		});
	});
}
