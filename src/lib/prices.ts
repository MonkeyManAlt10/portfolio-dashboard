import { QuoteData } from "./types";

// Server-side in-memory cache (60-second TTL)
const cache = new Map<string, { data: QuoteData; expiresAt: number }>();

interface YahooQuote {
  regularMarketPrice?: number;
  ask?: number;
  currency?: string;
  marketState?: string;
  regularMarketTime?: Date | number | string;
  quoteType?: string;
}

async function fetchSingleQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const yahooFinance = (await import("yahoo-finance2")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (yahooFinance.quote as (t: string) => Promise<any>)(ticker);
    const quote = raw as YahooQuote;

    const isMutualFund =
      quote.quoteType === "MUTUALFUND" || ticker.toUpperCase().endsWith("X");

    const price = quote.regularMarketPrice ?? quote.ask ?? null;
    if (price == null) return null;

    const lastPriceDate = quote.regularMarketTime
      ? new Date(quote.regularMarketTime as string | number | Date)
          .toISOString()
          .split("T")[0]
      : undefined;

    return {
      price,
      currency: quote.currency ?? "USD",
      marketState: quote.marketState ?? "CLOSED",
      lastUpdated: new Date().toISOString(),
      isMutualFund,
      lastPriceDate,
    };
  } catch {
    return null;
  }
}

export async function batchQuote(
  tickers: string[]
): Promise<Record<string, QuoteData>> {
  const now = Date.now();
  const result: Record<string, QuoteData> = {};
  const toFetch: string[] = [];

  for (const ticker of tickers) {
    const cached = cache.get(ticker);
    if (cached && cached.expiresAt > now) {
      result[ticker] = cached.data;
    } else {
      toFetch.push(ticker);
    }
  }

  if (toFetch.length > 0) {
    const fetched = await Promise.allSettled(
      toFetch.map(async (ticker) => ({
        ticker,
        data: await fetchSingleQuote(ticker),
      }))
    );

    for (const settled of fetched) {
      if (settled.status === "fulfilled" && settled.value.data) {
        const { ticker, data } = settled.value;
        cache.set(ticker, { data, expiresAt: now + 60_000 });
        result[ticker] = data;
      }
    }
  }

  return result;
}

export function getMarketState(quotes: Record<string, QuoteData>): string {
  const states = Object.values(quotes).map((q) => q.marketState);
  if (states.includes("REGULAR")) return "REGULAR";
  if (states.includes("PRE")) return "PRE";
  if (states.includes("POST")) return "POST";
  return "CLOSED";
}

export function marketStateLabel(state: string): string {
  switch (state) {
    case "REGULAR": return "Market Open";
    case "PRE": return "Pre-Market";
    case "POST": return "After-Hours";
    default: return "Market Closed";
  }
}
