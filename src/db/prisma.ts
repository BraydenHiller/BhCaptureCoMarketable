import { existsSync, readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
	var __prisma: PrismaClient | undefined;
}

const LINUX_CA_PATH = '/usr/local/share/ca-certificates/aws-rds-us-east-2-bundle.crt';

function resolveSSLCa(): string {
	const envCa = process.env.NODE_EXTRA_CA_CERTS;
	if (envCa && existsSync(envCa)) {
		return readFileSync(envCa, 'utf8');
	}
	if (existsSync(LINUX_CA_PATH)) {
		return readFileSync(LINUX_CA_PATH, 'utf8');
	}
	throw new Error(
		`SSL CA bundle not found. Set NODE_EXTRA_CA_CERTS to the path of your CA certificate file for local SSL connections.`,
	);
}

function createPrismaClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error('DATABASE_URL is required');
	}

	const sslConfig =
		process.env.NODE_ENV === 'production'
			? { rejectUnauthorized: true, ca: resolveSSLCa() }
			: { rejectUnauthorized: false };

	const adapter = new PrismaPg({ connectionString, ssl: sslConfig });

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
