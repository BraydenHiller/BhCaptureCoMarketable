import "server-only";
import { withTenantRequestScope } from "@/lib/withTenantRequestScope";
import { getRequestDb } from "@/db/requestDb";
import { requireScopedTenantId } from "@/lib/requestScope";
import { notFound, redirect } from "next/navigation";
import { getClientGallerySession, createClientGallerySession, clearClientGallerySession } from "@/lib/auth/clientGallerySession";
import { isClientSessionValid, verifyClientPassword, verifyClientUsername } from "@/lib/galleryClientAuth";

type PageProps = {
	params: Promise<{ id: string }>;
	searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function Page({ params, searchParams }: PageProps) {
	const { id } = await params;
	const galleryId = id;
	const directParam = searchParams?.direct;
	const errorParam = searchParams?.error;
	const isDirect = directParam === '1';
	const errorMessage = errorParam === 'INVALID_CREDENTIALS' ? 'Invalid credentials.' : null;

	return await withTenantRequestScope(async () => {
		const db = getRequestDb();
		const tenantId = requireScopedTenantId();
		const gallery = await db.gallery.findUnique({
			where: { id: galleryId, tenantId },
			select: {
				id: true,
				name: true,
				accessMode: true,
				clientUsername: true,
				clientPasswordHash: true,
				createdAt: true,
			},
		});

		if (!gallery) {
			notFound();
		}
		const galleryData = gallery;

		async function signInClient(formData: FormData) {
			'use server';
			const direct = formData.get('direct') === '1';
			const usernameInput = (formData.get('username') as string | null) ?? '';
			const passwordInput = (formData.get('password') as string | null) ?? '';
			const nextUrl = direct ? `/p/galleries/${galleryId}?direct=1` : `/p/galleries/${galleryId}`;
			const errorUrl = direct
				? `/p/galleries/${galleryId}?direct=1&error=INVALID_CREDENTIALS`
				: `/p/galleries/${galleryId}?error=INVALID_CREDENTIALS`;

			if (!galleryData.clientPasswordHash) {
				redirect(errorUrl);
			}

			if (!direct) {
				const usernameOk = verifyClientUsername(usernameInput, galleryData.clientUsername ?? '');
				if (!usernameOk) {
					redirect(errorUrl);
				}
			}

			const passwordOk = await verifyClientPassword(passwordInput, galleryData.clientPasswordHash);
			if (!passwordOk) {
				redirect(errorUrl);
			}

			await createClientGallerySession({ tenantId, galleryId });
			redirect(nextUrl);
		}

		async function signOutClient(formData: FormData) {
			'use server';
			const direct = formData.get('direct') === '1';
			const nextUrl = direct ? `/p/galleries/${galleryId}?direct=1` : `/p/galleries/${galleryId}`;
			await clearClientGallerySession();
			redirect(nextUrl);
		}

		if (galleryData.accessMode === 'PUBLIC') {
			return (
				<div className="space-y-4">
					<h1 className="text-2xl font-bold">{galleryData.name}</h1>
					<p className="text-sm text-gray-600">Created: {galleryData.createdAt.toLocaleString()}</p>
					<p>Photos coming soon.</p>
				</div>
			);
		}

		const session = await getClientGallerySession();
		const isValid = isClientSessionValid(session, tenantId, galleryId);

		if (isValid) {
			return (
				<div className="space-y-4">
					<h1 className="text-2xl font-bold">{galleryData.name}</h1>
					<p className="text-sm text-gray-600">Created: {galleryData.createdAt.toLocaleString()}</p>
					<p>Photos coming soon.</p>
					<form action={signOutClient}>
						<input type="hidden" name="direct" value={isDirect ? '1' : '0'} />
						<button type="submit" className="border px-3 py-1 rounded">Sign out</button>
					</form>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold">{galleryData.name}</h1>
				<p className="text-sm text-gray-600">This gallery is private.</p>
				{errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
				<form action={signInClient} className="space-y-3">
					<input type="hidden" name="direct" value={isDirect ? '1' : '0'} />
					{isDirect ? null : (
						<div>
							<label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
							<input
								type="text"
								id="username"
								name="username"
								required
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
					)}
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>
					<button type="submit" className="border px-3 py-1 rounded">Sign in</button>
				</form>
			</div>
		);
	});
}
