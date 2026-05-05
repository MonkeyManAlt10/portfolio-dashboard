import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/storage";
import { batchQuote, getMarketState } from "@/lib/prices";
import type { EnrichedBucket, EnrichedPortfolio, EnrichedPosition } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portfolio = await getPortfolio();

    // Collect all unique tickers
    const tickers = [
      ...new Set(
        portfolio.buckets.flatMap((b) => b.positions.map((p) => p.ticker))
      ),
    ];

    const quotes = tickers.length > 0 ? await batchQuote(tickers) : {};
    const marketState = getMarketState(quotes);

    let grandTotal = 0;
    let grandTotalCostBasis = 0;
    let hasAnyPrice = false;

    const enrichedBuckets: EnrichedBucket[] = portfolio.buckets.map((bucket) => {
      let bucketTotal = 0;
      let bucketCostBasis = 0;
      let bucketHasPrice = false;

      const enrichedPositions: EnrichedPosition[] = bucket.positions.map((pos) => {
        const quote = quotes[pos.ticker];
        const currentPrice = quote?.price ?? null;
        const currentValue = currentPrice != null ? currentPrice * pos.shares : null;
        const totalCost = pos.costBasis * pos.shares;
        const gainLoss = currentValue != null ? currentValue - totalCost : null;
        const gainLossPct = gainLoss != null ? (gainLoss / totalCost) * 100 : null;

        bucketCostBasis += totalCost;
        if (currentValue != null) {
          bucketTotal += currentValue;
          bucketHasPrice = true;
        }

        return {
          ...pos,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPct,
          marketState: quote?.marketState,
          isMutualFund: quote?.isMutualFund,
          lastPriceDate: quote?.lastPriceDate,
        };
      });

      const totalGainLoss = bucketHasPrice ? bucketTotal - bucketCostBasis : null;
      const totalGainLossPct =
        totalGainLoss != null && bucketCostBasis > 0
          ? (totalGainLoss / bucketCostBasis) * 100
          : null;

      grandTotalCostBasis += bucketCostBasis;
      if (bucketHasPrice) {
        grandTotal += bucketTotal;
        hasAnyPrice = true;
      }

      return {
        ...bucket,
        positions: enrichedPositions,
        totalValue: bucketHasPrice ? bucketTotal : null,
        totalCostBasis: bucketCostBasis,
        totalGainLoss,
        totalGainLossPct,
      };
    });

    const grandTotalGainLoss = hasAnyPrice ? grandTotal - grandTotalCostBasis : null;
    const grandTotalGainLossPct =
      grandTotalGainLoss != null && grandTotalCostBasis > 0
        ? (grandTotalGainLoss / grandTotalCostBasis) * 100
        : null;

    const enriched: EnrichedPortfolio = {
      ...portfolio,
      buckets: enrichedBuckets,
      grandTotal: hasAnyPrice ? grandTotal : null,
      grandTotalCostBasis,
      grandTotalGainLoss,
      grandTotalGainLossPct,
      marketState,
    };

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Portfolio fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load portfolio" },
      { status: 500 }
    );
  }
}
