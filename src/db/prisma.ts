import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required');
}

const connectionString = process.env.DATABASE_URL;
const adapter = connectionString.includes('sslmode=require')
	? new PrismaPg({
			connectionString,
			ssl: {
				rejectUnauthorized: true,
				ca: readFileSync('/usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt', 'utf8'),
			},
		})
	: new PrismaPg({ connectionString });

declare global {
	var __prisma: PrismaClient | undefined;
}

const client = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma = client;
}

export const prisma = client;
