import { NextRequest, NextResponse } from "next/server";
import { batchQuote } from "@/lib/prices";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get("tickers");
  if (!tickersParam) {
    return NextResponse.json({ error: "tickers param required" }, { status: 400 });
  }

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50); // hard cap

  if (tickers.length === 0) {
    return NextResponse.json({ error: "No valid tickers" }, { status: 400 });
  }

  try {
    const quotes = await batchQuote(tickers);
    return NextResponse.json(quotes);
  } catch (err) {
    console.error("Prices fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
