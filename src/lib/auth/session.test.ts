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

describe('session', () => {
	beforeEach(() => {
		process.env.AUTH_SESSION_SECRET = 'test-secret-key-at-least-32-chars-long';
		cookieStore = new Map();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('createSession then getSession returns the same sub, role, and tenantId', async () => {
		const { createSession, getSession } = await import('./session');

		await createSession({ sub: 'user123', role: 'MASTER_ADMIN' });
		const session = await getSession();

		expect(session).toBeTruthy();
		expect(session?.sub).toBe('user123');
		expect(session?.role).toBe('MASTER_ADMIN');
		expect(session?.tenantId).toBeUndefined();
	});

	it('expired session returns null', async () => {
		const { createSession, getSession } = await import('./session');

		await createSession({ sub: 'user456', role: 'TENANT', tenantId: 't1' }, { maxAgeSeconds: -1 });
		const session = await getSession();

		expect(session).toBeNull();
	});

	it('invalid signature returns null', async () => {
		const { createSession, getSession } = await import('./session');

		await createSession({ sub: 'user789', role: 'TENANT' });

		const originalToken = cookieStore.get('bh_session');
		if (originalToken) {
			cookieStore.set('bh_session', originalToken + 'tampered');
		}

		const session = await getSession();
		expect(session).toBeNull();
	});
});
