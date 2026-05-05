import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPortfolio, savePortfolio } from "@/lib/storage";
import type { RothSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  let body: Partial<RothSettings>;
  try {
    body = await request.json() as Partial<RothSettings>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const portfolio = await getPortfolio();
  portfolio.rothSettings = { ...portfolio.rothSettings, ...body };
  await savePortfolio(portfolio);

  return NextResponse.json(portfolio.rothSettings);
}
