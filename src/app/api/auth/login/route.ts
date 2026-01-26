import { NextRequest, NextResponse } from "next/server";
import { verifyMasterAdmin } from "@/lib/auth/masterAdmin";
import { signInTenant } from "@/lib/auth/tenantAuth";
import { getTenantUserByCognitoSub, assertTenantUserIsValid } from "@/db/user";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const username = formData.get("username") as string;
	const password = formData.get("password") as string;

	if (!username || !password) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	// Attempt Master Admin login
	const isMasterAdmin = await verifyMasterAdmin(username, password);
	if (isMasterAdmin) {
		await createSession({ sub: "master", role: "MASTER_ADMIN" });
		redirect("/admin");
	}

	// Attempt Tenant login
	try {
		const { cognitoSub } = await signInTenant(username, password);
		const user = await getTenantUserByCognitoSub(cognitoSub);

		if (!user) {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}

		assertTenantUserIsValid(user);
		await createSession({ sub: cognitoSub, role: "TENANT", tenantId: user.tenantId! });
		redirect("/app");
	} catch (err) {
		// Next.js redirect() throws a NEXT_REDIRECT error; do not treat it as auth failure.
		if (err && typeof err === "object" && "digest" in err) {
			const digest = (err as { digest?: unknown }).digest;
			if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
				throw err;
			}
		}
		console.error("[auth/login] tenant sign-in failed", err);
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}
}
