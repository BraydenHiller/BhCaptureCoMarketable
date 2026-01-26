import { clearSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function POST() {
	await clearSession();
	redirect("/login");
}

export async function GET() {
	await clearSession();
	redirect("/login");
}
