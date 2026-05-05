import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPortfolio, savePortfolio } from "@/lib/storage";
import type { Bucket } from "@/lib/types";

export const dynamic = "force-dynamic";

// PATCH /api/buckets/[id] — update bucket metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  let body: { updates?: Partial<Bucket> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { updates } = body;
  if (!updates) return NextResponse.json({ error: "updates required" }, { status: 400 });

  const portfolio = await getPortfolio();
  const idx = portfolio.buckets.findIndex((b) => b.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }

  portfolio.buckets[idx] = {
    ...portfolio.buckets[idx],
    ...updates,
    id, // prevent id change
    positions: portfolio.buckets[idx].positions, // prevent positions override
  };

  await savePortfolio(portfolio);
  return NextResponse.json(portfolio.buckets[idx]);
}

// DELETE /api/buckets/[id] — remove a bucket (only if empty)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const portfolio = await getPortfolio();
  const bucket = portfolio.buckets.find((b) => b.id === id);
  if (!bucket) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
  }
  if (bucket.positions.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a bucket that still has positions. Sell or remove them first." },
      { status: 400 }
    );
  }

  portfolio.buckets = portfolio.buckets.filter((b) => b.id !== id);
  await savePortfolio(portfolio);

  return NextResponse.json(portfolio);
}
