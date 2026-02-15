import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
	CognitoIdentityProviderClient,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createTenantSignup } from "@/db/signup";
import { createSession } from "@/lib/auth/session";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const tenantName = formData.get("tenantName") as string;
	const tenantSlug = formData.get("tenantSlug") as string;
	const username = formData.get("username") as string;
	const password = formData.get("password") as string;

	if (!tenantName || !tenantSlug || !username || !password) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}

	const userPoolId = process.env.COGNITO_USER_POOL_ID;
	if (!userPoolId) {
		return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
	}

	try {
		await client.send(
			new AdminCreateUserCommand({
				UserPoolId: userPoolId,
				Username: username,
				UserAttributes: [{ Name: "email", Value: username }],
			})
		);

		await client.send(
			new AdminSetUserPasswordCommand({
				UserPoolId: userPoolId,
				Username: username,
				Password: password,
				Permanent: true,
			})
		);

		const userResponse = await client.send(
			new AdminGetUserCommand({
				UserPoolId: userPoolId,
				Username: username,
			})
		);

		const subAttribute = userResponse.UserAttributes?.find(
			(attr) => attr.Name === "sub"
		);
		if (!subAttribute?.Value) {
			throw new Error("No sub attribute found");
		}

		const { tenantId } = await createTenantSignup({
			tenantName,
			tenantSlug,
			cognitoSub: subAttribute.Value,
			email: username,
		});

		await createSession({ sub: subAttribute.Value, role: "TENANT", tenantId });
		redirect("/billing");
	} catch (err) {
		if (err && typeof err === "object" && "digest" in err) {
			const digest = (err as { digest?: unknown }).digest;
			if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
				throw err;
			}
		}

		if (err instanceof Error && err.message === "TENANT_SLUG_TAKEN") {
			return NextResponse.json(
				{ error: "Tenant slug already taken" },
				{ status: 409 }
			);
		}

		return NextResponse.json({ error: "Signup failed" }, { status: 500 });
	}
}
