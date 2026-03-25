"use client";

import { useCallback, useState } from "react";

/* ── Types ─────────────────────────────────────────────── */

type PhotoInfo = {
	id: string;
	originalFilename: string | null;
	altText: string | null;
	caption: string | null;
	priceInCents: number | null;
};

type PurchaseItem = { id: string; photoId: string; priceInCents: number };

type PurchaseResponse = {
	id: string;
	status: string;
	totalInCents: number;
	platformFeeInCents: number;
	items: PurchaseItem[];
};

type Props = {
	galleryId: string;
	photos: PhotoInfo[];
	entitledPhotoIds?: string[];
};

/* ── Helpers ───────────────────────────────────────────── */

function formatCents(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

type CheckoutResponse = PurchaseResponse & { checkoutUrl?: string };

function parseCheckout(data: unknown): CheckoutResponse | null {
	if (
		typeof data === "object" &&
		data !== null &&
		"id" in data &&
		"status" in data &&
		"totalInCents" in data &&
		"items" in data &&
		Array.isArray((data as PurchaseResponse).items)
	) {
		return data as CheckoutResponse;
	}
	return null;
}

/* ── Component ─────────────────────────────────────────── */

export default function PurchaseClient({ galleryId, photos, entitledPhotoIds = [] }: Props) {
	const entitledSet = new Set(entitledPhotoIds);
	const purchasable = photos.filter(
		(p): p is PhotoInfo & { priceInCents: number } => typeof p.priceInCents === "number" && p.priceInCents > 0,
	);

	const [cartIds, setCartIds] = useState<Set<string>>(new Set());
	const [checkingOut, setCheckingOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);

	const totalCents = purchasable
		.filter((p) => cartIds.has(p.id) && !entitledSet.has(p.id))
		.reduce((sum, p) => sum + p.priceInCents, 0);

	const toggleCart = useCallback((photoId: string) => {
		setCartIds((prev) => {
			const next = new Set(prev);
			if (next.has(photoId)) {
				next.delete(photoId);
			} else {
				next.add(photoId);
			}
			return next;
		});
	}, []);

	async function handleCheckout() {
		const checkoutIds = Array.from(cartIds).filter((id) => !entitledSet.has(id));
		if (checkingOut || checkoutIds.length === 0) return;
		setCheckingOut(true);
		setError(null);
		try {
			const res = await fetch(`/api/p/galleries/${galleryId}/purchase/checkout`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ photoIds: checkoutIds }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const code = (body as { error?: string } | null)?.error;
				if (res.status === 401) {
					setError("Unauthorized. Please sign in again.");
					return;
				}
				setError(code ?? `Checkout failed (${res.status})`);
				return;
			}
			const json: unknown = await res.json();
			const parsed = parseCheckout(json);
			if (!parsed) {
				setError("Unexpected response format.");
				return;
			}
			if (parsed.checkoutUrl) {
				window.location.href = parsed.checkoutUrl;
				return;
			}
			setPurchase(parsed);
		} catch {
			setError("Network error during checkout.");
		} finally {
			setCheckingOut(false);
		}
	}

	/* ── Success state ─────────────────────────────────── */

	if (purchase) {
		return (
			<div className="space-y-4">
				<div className="bg-green-50 border border-green-200 rounded px-4 py-3">
					<p className="font-medium text-green-800">Purchase created</p>
					<p className="text-sm text-green-700">
						Order {purchase.id.slice(0, 8)}… &middot; {purchase.items.length} photo{purchase.items.length !== 1 ? "s" : ""} &middot; Total: {formatCents(purchase.totalInCents)}
					</p>
					<p className="text-xs text-green-600 mt-1">Status: {purchase.status}</p>
				</div>
			</div>
		);
	}

	/* ── Empty state ───────────────────────────────────── */

	if (purchasable.length === 0) {
		return null;
	}

	/* ── Cart UI ───────────────────────────────────────── */

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">Purchase Photos</h2>

			{error && (
				<p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
					{error}
				</p>
			)}

			{/* Photo grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{purchasable.map((photo) => {
					const entitled = entitledSet.has(photo.id);
					const inCart = !entitled && cartIds.has(photo.id);
					return (
						<div
							key={photo.id}
							className={`border rounded p-3 flex flex-col gap-1 ${
								entitled
									? "border-green-400 bg-green-50"
									: inCart
										? "border-blue-500 bg-blue-50"
										: "border-gray-200"
							}`}
						>
							<p className="text-sm font-medium truncate">
								{photo.caption || photo.altText || photo.originalFilename || "Untitled"}
							</p>
							<p className="text-xs text-gray-500">
								{formatCents(photo.priceInCents)} &middot; ID: {photo.id.slice(0, 8)}…
							</p>
							{entitled ? (
								<span className="mt-auto text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-800 text-center">
									Purchased
								</span>
							) : (
								<button
									type="button"
									disabled={checkingOut}
									onClick={() => toggleCart(photo.id)}
									className={`mt-auto text-sm px-3 py-1 rounded border ${
										checkingOut
											? "opacity-50 cursor-not-allowed"
											: inCart
												? "border-red-300 text-red-700 hover:bg-red-50"
												: "border-blue-300 text-blue-700 hover:bg-blue-50"
									}`}
								>
									{inCart ? "Remove" : "Add to cart"}
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Cart summary + checkout */}
			<div className="flex items-center justify-between border-t pt-3">
				<p className="text-sm font-medium">
					{cartIds.size} photo{cartIds.size !== 1 ? "s" : ""} in cart &middot; Total: {formatCents(totalCents)}
				</p>
				<button
					type="button"
					disabled={checkingOut || cartIds.size === 0}
					onClick={handleCheckout}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{checkingOut ? "Processing…" : "Checkout"}
				</button>
			</div>
		</div>
	);
}
