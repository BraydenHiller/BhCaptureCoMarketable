import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requireMainDomain } from './requireMainDomain';

function makeHeadersMock(values: Record<string, string | undefined>): Headers {
	const get = (name: string): string | null => {
		const v = values[name.toLowerCase()];
		return typeof v === "string" ? v : null;
	};

	const has = (name: string): boolean => get(name) !== null;

	const append = (...args: unknown[]): void => { void args; };
	const set = (...args: unknown[]): void => { void args; };
	const del = (...args: unknown[]): void => { void args; };
	const getSetCookie = (): string[] => [];

	const entries = function* (): IterableIterator<[string, string]> {
		for (const [k, v] of Object.entries(values)) {
			if (typeof v === "string") yield [k, v];
		}
	};

	const keys = function* (): IterableIterator<string> {
		for (const [k, v] of Object.entries(values)) {
			if (typeof v === "string") yield k;
		}
	};

	const vals = function* (): IterableIterator<string> {
		for (const v of Object.values(values)) {
			if (typeof v === "string") yield v;
		}
	};

	const forEach = (cb: (value: string, key: string, parent: Headers) => void): void => {
		const mockHeaders = mock as unknown as Headers;
		for (const [k, v] of Object.entries(values)) {
			if (typeof v === "string") cb(v, k, mockHeaders);
		}
	};

	const iterator = function* (): IterableIterator<[string, string]> {
		yield* entries();
	};

	const mock = {
		get,
		has,
		append,
		set,
		delete: del,
		getSetCookie,
		entries,
		keys,
		values: vals,
		forEach,
		[Symbol.iterator]: iterator,
	};

	return mock as unknown as Headers;
}

vi.mock('next/headers', () => ({
	headers: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	redirect: vi.fn((url: string) => {
		throw new Error(`REDIRECT:${url}`);
	}),
}));

describe('requireMainDomain', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('passes when host matches main domain', async () => {
		vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'app.example.com');
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue(makeHeadersMock({ host: 'app.example.com' }));

		await expect(requireMainDomain()).resolves.toBeUndefined();
	});

	it('passes when host matches main domain with port', async () => {
		vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'app.example.com');
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue(makeHeadersMock({ host: 'app.example.com:3000' }));

		await expect(requireMainDomain()).resolves.toBeUndefined();
	});

	it('redirects when host differs from main domain', async () => {
		vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'app.example.com');
		vi.stubEnv('NODE_ENV', 'development');
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue(makeHeadersMock({ 
			host: 'tenant1.example.com',
			'x-invoke-path': '/app/dashboard'
		}));

		await expect(requireMainDomain()).rejects.toThrow('REDIRECT:http://app.example.com/app/dashboard');
	});

	it('throws if NEXT_PUBLIC_MAIN_DOMAIN is missing', async () => {
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue(makeHeadersMock({ host: 'app.example.com' }));

		await expect(requireMainDomain()).rejects.toThrow('NEXT_PUBLIC_MAIN_DOMAIN is required');
	});

	it('throws if host header is missing', async () => {
		vi.stubEnv('NEXT_PUBLIC_MAIN_DOMAIN', 'app.example.com');
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue(makeHeadersMock({}));

		await expect(requireMainDomain()).rejects.toThrow('Host header missing');
	});
});
