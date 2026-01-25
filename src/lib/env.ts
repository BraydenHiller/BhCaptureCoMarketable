import { z } from 'zod';

const isCI = Boolean(process.env.CI);

// server-side vars: DATABASE_URL required locally, optional in CI
const serverEnvSchema = z.object({
	APP_ENV: z.string().default('local'),
	DATABASE_URL: isCI
		? z.string().optional()
		: z.string().min(1, 'DATABASE_URL is required in local/dev').nonempty(),
});

// client-side (public) vars
const clientSchema = z.object({
	NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsedServer = serverEnvSchema.parse({
	APP_ENV: process.env.APP_ENV,
	DATABASE_URL: process.env.DATABASE_URL,
});

const parsedClient = clientSchema.parse({
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const env = {
	...parsedServer,
	...parsedClient,
};
