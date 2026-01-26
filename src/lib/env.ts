import { z } from 'zod';

// server-side vars: DATABASE_URL required locally, optional in CI
const serverEnvSchema = z.object({
	APP_ENV: z.string().default('local'),
	DATABASE_URL: z.string().nonempty(),
	AUTH_SESSION_SECRET: z.string().min(32, "AUTH_SESSION_SECRET must be at least 32 characters"),
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
