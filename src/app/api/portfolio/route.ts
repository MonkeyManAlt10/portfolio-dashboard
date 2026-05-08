import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/storage";
import { batchQuote, getMarketState } from "@/lib/prices";
import type { EnrichedBucket, EnrichedPortfolio, EnrichedPosition } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const portfolio = await getPortfolio();

    const tickers = [
      ...new Set(
        portfolio.buckets.flatMap((b) => b.positions.map((p) => p.ticker))
      ),
    ];

    const quotes = tickers.length > 0 ? await batchQuote(tickers) : {};
    const marketState = getMarketState(quotes);

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    const closedPositions = portfolio.closedPositions ?? [];
    const realizedByBucket = new Map<string, { today: number; total: number }>();
    for (const cp of closedPositions) {
      const entry = realizedByBucket.get(cp.bucketId) ?? { today: 0, total: 0 };
      entry.total += cp.realizedGain;
      if (cp.lastSellDate?.slice(0, 10) === todayKey) entry.today += cp.realizedGain;
      realizedByBucket.set(cp.bucketId, entry);
    }

    let grandTotal = 0;
    let grandTotalCostBasis = 0;
    let hasAnyPrice = false;

    const enrichedBuckets: EnrichedBucket[] = portfolio.buckets.map((bucket) => {
      let bucketTotal = 0;
      let bucketCostBasis = 0;
      let bucketHasPrice = false;
      let bucketDayChange = 0;
      let bucketHasDayChange = false;

      const enrichedPositions: EnrichedPosition[] = bucket.positions.map((pos) => {
        const quote = quotes[pos.ticker];
        const currentPrice = quote?.price ?? null;
        const currentValue = currentPrice != null ? currentPrice * pos.shares : null;
        const totalCost = pos.costBasis * pos.shares;
        const gainLoss = currentValue != null ? currentValue - totalCost : null;
        const gainLossPct = gainLoss != null ? (gainLoss / totalCost) * 100 : null;

        const dayChangePerShare = quote?.todayChange ?? null;
        const dayChange = dayChangePerShare != null ? dayChangePerShare * pos.shares : null;
        const dayChangePct = quote?.todayChangePct ?? null;

        const addedDate = new Date(pos.addedDate);
        const daysHeld = Math.floor((today.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));

        bucketCostBasis += totalCost;
        if (currentValue != null) {
          bucketTotal += currentValue;
          bucketHasPrice = true;
        }
        if (dayChange != null && !quote?.isMutualFund) {
          bucketDayChange += dayChange;
          bucketHasDayChange = true;
        }

        return {
          ...pos,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPct,
          dayChange,
          dayChangePct,
          daysHeld,
          marketState: quote?.marketState,
          isMutualFund: quote?.isMutualFund,
          lastPriceDate: quote?.lastPriceDate,
        };
      });

      const realized = realizedByBucket.get(bucket.id) ?? { today: 0, total: 0 };

      const unrealized = bucketHasPrice ? bucketTotal - bucketCostBasis : null;
      const totalGainLoss = unrealized != null ? unrealized + realized.total : null;
      const totalGainLossPct =
        totalGainLoss != null && bucketCostBasis > 0
          ? (totalGainLoss / bucketCostBasis) * 100
          : null;

      const hasTodayComponent = bucketHasDayChange || realized.today !== 0;
      const todayChange = hasTodayComponent ? bucketDayChange + realized.today : null;
      const todayChangePct =
        todayChange != null && bucketTotal > 0
          ? (todayChange / (bucketTotal - todayChange)) * 100
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
        todayChange,
        todayChangePct,
        realizedToday: realized.today,
        realizedTotal: realized.total,
      };
    });

    const realizedTotalAll = closedPositions.reduce((s, p) => s + p.realizedGain, 0);
    const realizedTodayAll = closedPositions.reduce(
      (s, p) => s + (p.lastSellDate?.slice(0, 10) === todayKey ? p.realizedGain : 0),
      0,
    );

    const grandUnrealized = hasAnyPrice ? grandTotal - grandTotalCostBasis : null;
    const grandTotalGainLoss = grandUnrealized != null ? grandUnrealized + realizedTotalAll : null;
    const grandTotalGainLossPct =
      grandTotalGainLoss != null && grandTotalCostBasis > 0
        ? (grandTotalGainLoss / grandTotalCostBasis) * 100
        : null;

    const enriched: EnrichedPortfolio = {
      ...portfolio,
      closedPositions,
      buckets: enrichedBuckets,
      grandTotal: hasAnyPrice ? grandTotal : null,
      grandTotalCostBasis,
      grandTotalGainLoss,
      grandTotalGainLossPct,
      marketState,
      realizedYTD: realizedTotalAll,
      realizedToday: realizedTodayAll,
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
