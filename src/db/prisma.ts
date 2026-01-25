import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required');
}

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

declare global {
	interface GlobalThis {
		__prisma?: PrismaClient;
	}
}

const client = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma = client;
}

export const prisma = client;
