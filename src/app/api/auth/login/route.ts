import { NextRequest, NextResponse } from "next/server";
import { verifyMasterAdmin } from "@/lib/auth/masterAdmin";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function POST(request: NextRequest) {
	const formData = await request.formData();
	const username = formData.get("username") as string;
	const password = formData.get("password") as string;

	if (!username || !password) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const isMasterAdmin = await verifyMasterAdmin(username, password);
	if (isMasterAdmin) {
		await createSession({ sub: "master", role: "MASTER_ADMIN" });
		redirect("/admin");
	}

	return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
