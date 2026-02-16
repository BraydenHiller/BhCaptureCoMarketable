import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

type Cookie = {
	name: string;
	value: string;
};

let cookieStore: Map<string, string>;

vi.mock('next/headers', () => ({
	cookies: vi.fn(async () => ({
		get: (name: string): Cookie | undefined => {
			const value = cookieStore.get(name);
			return value ? { name, value } : undefined;
		},
		set: (name: string, value: string) => {
			cookieStore.set(name, value);
		},
		delete: (name: string) => {
			cookieStore.delete(name);
		},
	})),
}));

describe('clientGallerySession', () => {
	beforeEach(() => {
		process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long';
		cookieStore = new Map();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('createClientGallerySession then getClientGallerySession returns role and ids', async () => {
		const { createClientGallerySession, getClientGallerySession } = await import('./clientGallerySession');

		await createClientGallerySession({ tenantId: 't1', galleryId: 'g1' });
		const session = await getClientGallerySession();

		expect(session).toBeTruthy();
		expect(session?.role).toBe('CLIENT_GALLERY');
		expect(session?.tenantId).toBe('t1');
		expect(session?.galleryId).toBe('g1');
	});

	it('clearClientGallerySession then getClientGallerySession returns null', async () => {
		const { createClientGallerySession, getClientGallerySession, clearClientGallerySession } = await import('./clientGallerySession');

		await createClientGallerySession({ tenantId: 't1', galleryId: 'g1' });
		await clearClientGallerySession();
		const session = await getClientGallerySession();

		expect(session).toBeNull();
	});

	it('invalid token returns null', async () => {
		const { createClientGallerySession, getClientGallerySession } = await import('./clientGallerySession');

		await createClientGallerySession({ tenantId: 't1', galleryId: 'g1' });

		const originalToken = cookieStore.get('bh_client_gallery');
		if (originalToken) {
			cookieStore.set('bh_client_gallery', originalToken + 'tampered');
		}

		const session = await getClientGallerySession();
		expect(session).toBeNull();
	});
});
