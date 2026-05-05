import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const password =
    request.nextUrl.searchParams.get("password") ??
    request.headers.get("x-edit-password") ??
    "";

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return NextResponse.json(
      { error: "KV not configured — nothing to reset" },
      { status: 400 }
    );
  }

  const { kv } = await import("@vercel/kv");
  await kv.del("portfolio:main");

  return NextResponse.json({
    ok: true,
    message: "KV key deleted. Next page load will reseed from seed.json.",
  });
}
