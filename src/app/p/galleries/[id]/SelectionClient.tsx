"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────── */

type SelectionItem = { id: string; photoId: string; note: string | null };

type SelectionResponse = {
	id: string;
	status: string;
	submittedAt: string | null;
	items: SelectionItem[];
};

type PhotoInfo = {
	id: string;
	caption: string | null;
	altText: string | null;
	sortOrder: number;
};

type Props = {
	galleryId: string;
	photos: PhotoInfo[];
	maxSelections: number | null;
};

/* ── Helpers ───────────────────────────────────────────── */

function parseSelection(data: unknown): SelectionResponse | null {
	if (
		typeof data === "object" &&
		data !== null &&
		"id" in data &&
		"status" in data &&
		"items" in data &&
		Array.isArray((data as SelectionResponse).items)
	) {
		return data as SelectionResponse;
	}
	return null;
}

function isSubmitted(status: string): boolean {
	return status === "SUBMITTED";
}

/* ── Component ─────────────────────────────────────────── */

export default function SelectionClient({ galleryId, photos, maxSelections }: Props) {
	const [selectionStatus, setSelectionStatus] = useState<string>("DRAFT");
	const [submittedAt, setSubmittedAt] = useState<string | null>(null);
	const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
	const [submitting, setSubmitting] = useState(false);
	const [unauthorized, setUnauthorized] = useState(false);

	const disabled = unauthorized || isSubmitted(selectionStatus);
	const overLimit = typeof maxSelections === "number" && selectedPhotoIds.size > maxSelections;
	/* Apply a server selection response to local state */
	const applySelection = useCallback((sel: SelectionResponse) => {
		setSelectionStatus(sel.status);
		setSubmittedAt(sel.submittedAt);
		setSelectedPhotoIds(new Set(sel.items.map((i) => i.photoId)));
	}, []);

	/* ── Initial fetch ─────────────────────────────────── */

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const res = await fetch(`/api/p/galleries/${galleryId}/selection`);
				if (!res.ok) {
					const body = await res.json().catch(() => null);
						if (res.status === 401) {
						setUnauthorized(true);
						setError("Unauthorized. Please sign in again.");
						return;
					}
					setError(
						(body as { error?: string } | null)?.error ?? `Failed to load selection (${res.status})`,
					);
					return;
				}
				const json: unknown = await res.json();
				const sel = parseSelection(json);
				if (!sel) {
					setError("Unexpected response format.");
					return;
				}
				if (!cancelled) applySelection(sel);
			} catch {
				if (!cancelled) setError("Network error loading selection.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [galleryId, applySelection]);

	/* ── Toggle (add / remove) ─────────────────────────── */

	async function togglePhoto(photoId: string, selected: boolean) {
		if (disabled) return;
		setMutatingIds((prev) => new Set(prev).add(photoId));
		setError(null);
		try {
			const method = selected ? "DELETE" : "POST";
			const res = await fetch(`/api/p/galleries/${galleryId}/selection/items`, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ photoId }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const code = (body as { error?: string } | null)?.error;
					if (res.status === 401) {
					setUnauthorized(true);
					setError("Unauthorized. Please sign in again.");
					return;
				}
				if (code === "SELECTION_SUBMITTED") {
					setSelectionStatus("SUBMITTED");
					setError("Selection already submitted. Changes disabled.");
					return;
				}
				setError(code ?? `Toggle failed (${res.status})`);
				return;
			}
			const json: unknown = await res.json();
			const sel = parseSelection(json);
			if (sel) applySelection(sel);
		} catch {
			setError("Network error toggling photo.");
		} finally {
			setMutatingIds((prev) => {
				const next = new Set(prev);
				next.delete(photoId);
				return next;
			});
		}
	}

	/* ── Submit ────────────────────────────────────────── */

	async function handleSubmit() {
		if (disabled || submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const res = await fetch(`/api/p/galleries/${galleryId}/selection/submit`, {
				method: "POST",
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const code = (body as { error?: string } | null)?.error;
				if (res.status === 401) {
					setUnauthorized(true);
					setError("Unauthorized. Please sign in again.");
					return;
				}
				if (code === "MAX_SELECTIONS_EXCEEDED") {
					setError("Selection exceeds the maximum number of allowed photos. Please remove some and try again.");
					return;
				}
				if (code === "SELECTION_SUBMITTED") {
					setSelectionStatus("SUBMITTED");
					setError("Selection was already submitted.");
					return;
				}
				setError(code ?? `Submit failed (${res.status})`);
				return;
			}
			const json: unknown = await res.json();
			const sel = parseSelection(json);
			if (sel) applySelection(sel);
		} catch {
			setError("Network error submitting selection.");
		} finally {
			setSubmitting(false);
		}
	}

	/* ── Render ────────────────────────────────────────── */

	if (loading) {
		return <p className="text-sm text-gray-500">Loading selection…</p>;
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="font-medium">
					Selected {selectedPhotoIds.size}{typeof maxSelections === "number" ? ` / ${maxSelections}` : ""} photos
				</p>
					<span
					className={`text-xs font-semibold px-2 py-0.5 rounded ${
						unauthorized
							? "bg-red-100 text-red-800"
							: isSubmitted(selectionStatus)
								? "bg-green-100 text-green-800"
								: "bg-yellow-100 text-yellow-800"
					}`}
				>
					{unauthorized ? "UNAUTHORIZED" : selectionStatus}
				</span>
			</div>

			{isSubmitted(selectionStatus) && (
				<p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
					Selection submitted{submittedAt ? ` on ${new Date(submittedAt).toLocaleString()}` : ""}. Changes disabled.
				</p>
			)}

			{overLimit && !disabled && (
				<p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 px-3 py-2 rounded">
					You have selected more than the allowed {maxSelections} photos. Please remove some before submitting.
				</p>
			)}

			{error && (
				<p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
					{error}
				</p>
			)}

			{/* Photo grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{photos.map((photo) => {
					const selected = selectedPhotoIds.has(photo.id);
					const busy = mutatingIds.has(photo.id);
					return (
						<div
							key={photo.id}
							className={`border rounded p-3 flex flex-col gap-1 ${
								selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
							}`}
						>
							<p className="text-sm font-medium truncate">
								{photo.caption || photo.altText || "Untitled"}
							</p>
							<p className="text-xs text-gray-500">
								Sort: {photo.sortOrder} &middot; ID: {photo.id.slice(0, 8)}…
							</p>
							<button
								type="button"
								disabled={disabled || busy}
								onClick={() => togglePhoto(photo.id, selected)}
								className={`mt-auto text-sm px-3 py-1 rounded border ${
									disabled || busy
										? "opacity-50 cursor-not-allowed"
										: selected
											? "border-red-300 text-red-700 hover:bg-red-50"
											: "border-blue-300 text-blue-700 hover:bg-blue-50"
								}`}
							>
								{busy ? "…" : selected ? "Remove" : "Add"}
							</button>
						</div>
					);
				})}
			</div>

			{/* Submit */}
			{!disabled && (
				<button
					type="button"
					disabled={submitting || selectedPhotoIds.size === 0}
					onClick={handleSubmit}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{submitting ? "Submitting…" : "Submit selection"}
				</button>
			)}
		</div>
	);
}
