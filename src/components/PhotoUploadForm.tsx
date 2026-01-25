'use client';

import { useState } from 'react';

export default function PhotoUploadForm({ uploadUrl, photoId, galleryId }: { uploadUrl: string; photoId: string; galleryId: string }) {
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return;
		setUploading(true);
		setError(null);
		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: formData });
			if (!uploadRes.ok) throw new Error('Upload failed');

			const bytes = file.size;
			let width = 0, height = 0;
			if (file.type.startsWith('image/')) {
				const img = new Image();
				img.src = URL.createObjectURL(file);
				await new Promise((resolve, reject) => {
					img.onload = resolve;
					img.onerror = reject;
				});
				width = img.width;
				height = img.height;
			}

			const finalizeRes = await fetch(`/galleries/${galleryId}/photos/${photoId}/finalize`, {
				method: 'POST',
				body: JSON.stringify({ bytes, width, height }),
				headers: { 'Content-Type': 'application/json' },
			});
			if (!finalizeRes.ok) throw new Error('Finalize failed');

			window.location.href = `/galleries/${galleryId}`;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			setUploading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="file" className="block text-sm font-medium text-gray-700">Select Photo</label>
				<input
					type="file"
					id="file"
					accept="image/*"
					onChange={(e) => setFile(e.target.files?.[0] || null)}
					required
					className="mt-1 block w-full"
				/>
			</div>
			<button
				type="submit"
				disabled={uploading || !file}
				className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
			>
				{uploading ? 'Uploading...' : 'Upload Photo'}
			</button>
			{error && <p className="text-red-500">{error}</p>}
		</form>
	);
}
