import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "bh_session";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

type SessionPayload = {
	sub: string;
	role: "MASTER_ADMIN" | "TENANT";
	tenantId?: string;
	iat: number;
	exp: number;
};

function getSecretKey(): Uint8Array {
	const secret = process.env.AUTH_SESSION_SECRET;
	if (!secret) {
		throw new Error("AUTH_SESSION_SECRET is required");
	}
	return new TextEncoder().encode(secret);
}

async function signPayload(payload: SessionPayload): Promise<string> {
	return new SignJWT(payload as unknown as Record<string, unknown>)
		.setProtectedHeader({ alg: "HS256" })
		.sign(getSecretKey());
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		return payload as SessionPayload;
	} catch {
		return null;
	}
}

export async function createSession(
	payload: { sub: string; role: "MASTER_ADMIN" | "TENANT"; tenantId?: string },
	opts?: { maxAgeSeconds?: number }
): Promise<void> {
	const maxAge = opts?.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
	const now = Math.floor(Date.now() / 1000);
	const fullPayload: SessionPayload = {
		...payload,
		iat: now,
		exp: now + maxAge,
	};
	const token = await signPayload(fullPayload);
	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge,
		path: "/",
	});
}

export async function getSession(): Promise<SessionPayload | null> {
	const cookieStore = await cookies();
	const token = cookieStore.get(COOKIE_NAME)?.value;
	if (!token) return null;
	return verifyToken(token);
}

export async function clearSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(COOKIE_NAME);
}
