import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import BrokerageContent from "./BrokerageContent";
import { getPortfolio } from "@/lib/storage";
import { batchQuote, getMarketState } from "@/lib/prices";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function BrokeragePage() {
  const portfolio = await getPortfolio();
  const tickers = [
    ...new Set(portfolio.buckets.flatMap((b) => b.positions.map((p) => p.ticker))),
  ];
  const quotes = tickers.length > 0 ? await batchQuote(tickers) : {};
  const marketState = getMarketState(quotes);

  return (
    <>
      <Suspense><KeyboardShortcuts /></Suspense>
      <Header lastUpdated={portfolio.lastUpdated} marketState={marketState} />
      <BrokerageContent />
    </>
  );
}
