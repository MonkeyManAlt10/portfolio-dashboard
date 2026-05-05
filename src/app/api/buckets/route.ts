import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPortfolio, savePortfolio } from "@/lib/storage";
import type { Bucket } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/buckets — create a new bucket
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  let body: { bucket?: Omit<Bucket, "positions"> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bucket } = body;
  if (!bucket?.id || !bucket?.name || !bucket?.category || !bucket?.color) {
    return NextResponse.json(
      { error: "bucket with id, name, category, color required" },
      { status: 400 }
    );
  }

  const portfolio = await getPortfolio();
  if (portfolio.buckets.find((b) => b.id === bucket.id)) {
    return NextResponse.json({ error: "Bucket ID already exists" }, { status: 400 });
  }

  const newBucket: Bucket = { ...bucket, positions: [] };
  portfolio.buckets.push(newBucket);
  await savePortfolio(portfolio);

  return NextResponse.json(portfolio);
}
