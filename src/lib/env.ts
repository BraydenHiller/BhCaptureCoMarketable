import { z } from 'zod';

// server-side vars: DATABASE_URL required locally, optional in CI
const serverEnvSchema = z.object({
	APP_ENV: z.string().default('local'),
	DATABASE_URL: z.string().nonempty(),
	AUTH_SESSION_SECRET: z.string().min(32, "AUTH_SESSION_SECRET must be at least 32 characters"),
	AWS_REGION: z.string().nonempty("AWS_REGION is required"),
	PLATFORM_S3_BUCKET: z.string().nonempty("PLATFORM_S3_BUCKET is required"),
	COGNITO_APP_CLIENT_ID: z.string().nonempty("COGNITO_APP_CLIENT_ID is required"),
	NEXT_PUBLIC_MAIN_DOMAIN: z.string().nonempty("NEXT_PUBLIC_MAIN_DOMAIN is required"),
});

// client-side (public) vars
const clientSchema = z.object({
	NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const parsedServer = serverEnvSchema.parse({
	APP_ENV: process.env.APP_ENV,
	DATABASE_URL: process.env.DATABASE_URL,
	AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
	AWS_REGION: process.env.AWS_REGION,
	PLATFORM_S3_BUCKET: process.env.PLATFORM_S3_BUCKET,
	COGNITO_APP_CLIENT_ID: process.env.COGNITO_APP_CLIENT_ID,
	NEXT_PUBLIC_MAIN_DOMAIN: process.env.NEXT_PUBLIC_MAIN_DOMAIN,
});

const parsedClient = clientSchema.parse({
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const env = {
	...parsedServer,
	...parsedClient,
};
