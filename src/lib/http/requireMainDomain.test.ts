import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockHeaders {
	get: (name: string) => string | null;
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

	it('passes when host matches main domain', async () => {
		process.env.NEXT_PUBLIC_MAIN_DOMAIN = 'app.example.com';
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) => {
				if (name === 'host') return 'app.example.com';
				return null;
			},
		} as MockHeaders);

		const { requireMainDomain } = await import('./requireMainDomain');
		await expect(requireMainDomain()).resolves.toBeUndefined();
	});

	it('passes when host matches main domain with port', async () => {
		process.env.NEXT_PUBLIC_MAIN_DOMAIN = 'app.example.com';
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) => {
				if (name === 'host') return 'app.example.com:3000';
				return null;
			},
		} as MockHeaders);

		const { requireMainDomain } = await import('./requireMainDomain');
		await expect(requireMainDomain()).resolves.toBeUndefined();
	});

	it('redirects when host differs from main domain', async () => {
		process.env.NEXT_PUBLIC_MAIN_DOMAIN = 'app.example.com';
		process.env.NODE_ENV = 'development';
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) => {
				if (name === 'host') return 'tenant1.example.com';
				if (name === 'x-invoke-path') return '/app/dashboard';
				return null;
			},
		} as MockHeaders);

		const { requireMainDomain } = await import('./requireMainDomain');
		await expect(requireMainDomain()).rejects.toThrow('REDIRECT:http://app.example.com/app/dashboard');
	});

	it('throws if NEXT_PUBLIC_MAIN_DOMAIN is missing', async () => {
		delete process.env.NEXT_PUBLIC_MAIN_DOMAIN;
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue({
			get: (name: string) => {
				if (name === 'host') return 'app.example.com';
				return null;
			},
		} as MockHeaders);

		const { requireMainDomain } = await import('./requireMainDomain');
		await expect(requireMainDomain()).rejects.toThrow('NEXT_PUBLIC_MAIN_DOMAIN is required');
	});

	it('throws if host header is missing', async () => {
		process.env.NEXT_PUBLIC_MAIN_DOMAIN = 'app.example.com';
		const { headers } = await import('next/headers');
		vi.mocked(headers).mockResolvedValue({
			get: () => null,
		} as MockHeaders);

		const { requireMainDomain } = await import('./requireMainDomain');
		await expect(requireMainDomain()).rejects.toThrow('Host header missing');
	});
});
