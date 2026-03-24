import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    const code =
      err != null &&
      typeof err === "object" &&
      "code" in err &&
      typeof (err as Record<string, unknown>).code === "string"
        ? ((err as Record<string, unknown>).code as string)
        : undefined;
    return NextResponse.json(
      { ok: false, error: message, ...(code ? { code } : {}) },
      { status: 500 },
    );
  }
}
