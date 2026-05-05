import Header from "@/components/Header";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import BucketDetailContent from "./BucketDetailContent";
import { getPortfolio } from "@/lib/storage";
import { batchQuote, getMarketState } from "@/lib/prices";
import { Suspense } from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BucketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const portfolio = await getPortfolio();
  const bucket = portfolio.buckets.find((b) => b.id === id);
  if (!bucket) notFound();

  const tickers = [
    ...new Set(portfolio.buckets.flatMap((b) => b.positions.map((p) => p.ticker))),
  ];
  const quotes = tickers.length > 0 ? await batchQuote(tickers) : {};
  const marketState = getMarketState(quotes);

  return (
    <>
      <Suspense><KeyboardShortcuts /></Suspense>
      <Header lastUpdated={portfolio.lastUpdated} marketState={marketState} />
      <BucketDetailContent bucketId={id} />
    </>
  );
}
