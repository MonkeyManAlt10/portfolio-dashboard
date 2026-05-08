import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPortfolio, savePortfolio } from "@/lib/storage";
import type { TradeLogEntry, Position, ClosedPosition } from "@/lib/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function ok(data: unknown) {
  return NextResponse.json(data);
}

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// POST /api/positions — add a new position
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  let body: { bucketId?: string; position?: Position; __test?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    return err("Invalid JSON");
  }

  // Health-check call from PasswordModal
  if (body.__test) return err("Test request (auth passed)", 400);

  const { bucketId, position } = body;
  if (!bucketId || !position) return err("bucketId and position required");
  if (!position.ticker || typeof position.shares !== "number" || typeof position.costBasis !== "number") {
    return err("Position must have ticker, shares, costBasis");
  }

  const portfolio = await getPortfolio();
  const bucket = portfolio.buckets.find((b) => b.id === bucketId);
  if (!bucket) return err("Bucket not found", 404);

  const existing = bucket.positions.findIndex((p) => p.ticker === position.ticker);
  if (existing !== -1) return err("Position already exists. Use PATCH to update.");

  bucket.positions.push({ ...position, ticker: position.ticker.toUpperCase() });

  const tradeEntry: TradeLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    bucketId,
    action: "BUY",
    ticker: position.ticker.toUpperCase(),
    shares: position.shares,
    price: position.costBasis,
    notes: position.notes,
  };
  portfolio.tradeLog = [tradeEntry, ...portfolio.tradeLog];

  await savePortfolio(portfolio);
  return ok(bucket);
}

// PATCH /api/positions — update a position
export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  let body: { bucketId?: string; ticker?: string; updates?: Partial<Position> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return err("Invalid JSON");
  }

  const { bucketId, ticker, updates } = body;
  if (!bucketId || !ticker || !updates) return err("bucketId, ticker, updates required");

  const portfolio = await getPortfolio();
  const bucket = portfolio.buckets.find((b) => b.id === bucketId);
  if (!bucket) return err("Bucket not found", 404);

  const posIdx = bucket.positions.findIndex((p) => p.ticker === ticker.toUpperCase());
  if (posIdx === -1) return err("Position not found", 404);

  const prev = bucket.positions[posIdx];
  bucket.positions[posIdx] = { ...prev, ...updates, ticker: ticker.toUpperCase() };

  const tradeEntry: TradeLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    bucketId,
    action: "ADJUST",
    ticker: ticker.toUpperCase(),
    shares: updates.shares ?? prev.shares,
    price: updates.costBasis ?? prev.costBasis,
    notes: updates.notes,
  };
  portfolio.tradeLog = [tradeEntry, ...portfolio.tradeLog];

  await savePortfolio(portfolio);
  return ok(bucket);
}

// DELETE /api/positions — sell or remove a position
export async function DELETE(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response;

  let body: {
    bucketId?: string;
    ticker?: string;
    sharesSold?: number;
    salePrice?: number;
    notes?: string;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return err("Invalid JSON");
  }

  const { bucketId, ticker, sharesSold, salePrice, notes } = body;
  if (!bucketId || !ticker || typeof sharesSold !== "number" || typeof salePrice !== "number") {
    return err("bucketId, ticker, sharesSold, salePrice required");
  }

  const portfolio = await getPortfolio();
  const bucket = portfolio.buckets.find((b) => b.id === bucketId);
  if (!bucket) return err("Bucket not found", 404);

  const posIdx = bucket.positions.findIndex((p) => p.ticker === ticker.toUpperCase());
  if (posIdx === -1) return err("Position not found", 404);

  const pos = bucket.positions[posIdx];
  if (sharesSold > pos.shares + 0.00001) {
    return err(`Cannot sell ${sharesSold} shares — only holding ${pos.shares}`);
  }

  if (Math.abs(sharesSold - pos.shares) < 0.00001) {
    bucket.positions.splice(posIdx, 1);
  } else {
    bucket.positions[posIdx] = { ...pos, shares: pos.shares - sharesSold };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const tradeEntry: TradeLogEntry = {
    id: randomUUID(),
    timestamp: nowIso,
    bucketId,
    action: "SELL",
    ticker: ticker.toUpperCase(),
    shares: sharesSold,
    price: salePrice,
    notes,
  };
  portfolio.tradeLog = [tradeEntry, ...portfolio.tradeLog];

  const costBasisForLot = pos.costBasis * sharesSold;
  const proceeds = salePrice * sharesSold;
  const realizedGain = proceeds - costBasisForLot;
  const gainPercent = costBasisForLot > 0 ? (realizedGain / costBasisForLot) * 100 : 0;
  const firstBuyMs = new Date(pos.addedDate).getTime();
  const heldDays = Math.floor((now.getTime() - firstBuyMs) / (1000 * 60 * 60 * 24));
  const closed: ClosedPosition = {
    id: randomUUID(),
    bucketId,
    ticker: ticker.toUpperCase(),
    shares: sharesSold,
    avgBuyPrice: pos.costBasis,
    avgSellPrice: salePrice,
    costBasis: costBasisForLot,
    proceeds,
    realizedGain,
    gainPercent,
    holdingPeriod: heldDays > 365 ? "long" : "short",
    firstBuyDate: pos.addedDate,
    lastSellDate: nowIso.slice(0, 10),
    notes,
  };
  portfolio.closedPositions = [...(portfolio.closedPositions ?? []), closed];

  await savePortfolio(portfolio);
  return ok(bucket);
}
