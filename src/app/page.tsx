import { Suspense } from "react";
import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import DashboardContent from "./DashboardContent";
import { getPortfolio } from "@/lib/storage";
import { batchQuote, getMarketState } from "@/lib/prices";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const portfolio = await getPortfolio();
  const tickers = [
    ...new Set(portfolio.buckets.flatMap((b) => b.positions.map((p) => p.ticker))),
  ];
  const quotes = tickers.length > 0 ? await batchQuote(tickers) : {};
  const marketState = getMarketState(quotes);

  return (
    <>
      <Suspense>
        <KeyboardShortcuts />
      </Suspense>
      <Header lastUpdated={portfolio.lastUpdated} marketState={marketState} />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <main className="max-w-[1400px] mx-auto px-6 py-8 w-full">
      <div className="h-16 w-64 rounded-xl animate-pulse mb-8" style={{ backgroundColor: "#131c2f" }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: "#131c2f" }} />
        ))}
      </div>
    </main>
  );
}
