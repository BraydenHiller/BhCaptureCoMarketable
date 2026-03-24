import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
	var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is required');
	}

	const adapter = connectionString.includes('sslmode=require')
		? new PrismaPg({
				connectionString,
				ssl: {
					rejectUnauthorized: true,
					ca: readFileSync('/usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt', 'utf8'),
				},
			})
		: new PrismaPg({ connectionString });

	return new PrismaClient({ adapter });
}

let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		if (!_prisma) {
			_prisma = globalThis.__prisma ?? createPrismaClient();
			if (process.env.NODE_ENV !== 'production') {
				globalThis.__prisma = _prisma;
			}
		}
		return Reflect.get(_prisma, prop, receiver);
	},
});
