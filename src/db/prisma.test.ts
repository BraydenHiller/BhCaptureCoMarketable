import { describe, it, expect } from 'vitest';

describe('prisma', () => {
	it('is defined', async () => {
		process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/bhcaptureco?schema=public';
		const mod = await import('./prisma');
		expect(mod.prisma).toBeTruthy();
	});
});
