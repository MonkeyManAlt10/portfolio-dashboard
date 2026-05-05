const YahooFinanceClass = (await import("yahoo-finance2")).default;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "../src/data/seed.json");

const TODAY = "2026-05-05";

// Dollar values provided by the user
const targets = {
  VTSAX: 19266.42,
  ABBV:  206.11,
  AMZN:  547.10,
  META:  993.95,
  FXAIX: 54.25,
  QQQ:   824.07,
  JPM:   541.45,
  MSFT:  169.49,
};

const tickers = Object.keys(targets);

console.log("Fetching quotes for:", tickers.join(", "));

const quotes = await Promise.all(
  tickers.map(async (ticker) => {
    const raw = await yahooFinance.quote(ticker);
    return { ticker, price: raw.regularMarketPrice };
  })
);

console.log("\n=== Computed Positions ===");
const positions = {};
for (const { ticker, price } of quotes) {
  const value = targets[ticker];
  const shares = value / price;
  positions[ticker] = { price, shares, value };
  console.log(
    `${ticker.padEnd(6)} price=$${price.toFixed(4)}  shares=${shares.toFixed(6)}  value=$${value.toFixed(2)}`
  );
}

// SPAXX — hardcoded cash, not fetched from Yahoo
console.log(`SPAXX  price=$1.0000  shares=7327.460000  value=$7327.46`);

// Build the seed
const seed = JSON.parse(readFileSync(seedPath, "utf-8"));

// Replace VTSAX in roth-ira bucket
const rothBucket = seed.buckets.find((b) => b.id === "roth-ira");
rothBucket.positions = [
  {
    ticker: "VTSAX",
    shares: parseFloat(positions["VTSAX"].shares.toFixed(6)),
    costBasis: parseFloat(positions["VTSAX"].price.toFixed(4)),
    addedDate: TODAY,
  },
];

// Build long-term-core positions
const ltcBucket = seed.buckets.find((b) => b.id === "long-term-core");
const ltcTickers = ["ABBV", "AMZN", "META", "FXAIX", "QQQ", "JPM", "MSFT"];
ltcBucket.positions = [
  ...ltcTickers.map((ticker) => ({
    ticker,
    shares: parseFloat(positions[ticker].shares.toFixed(6)),
    costBasis: parseFloat(positions[ticker].price.toFixed(4)),
    addedDate: TODAY,
  })),
  {
    ticker: "SPAXX",
    shares: 7327.46,
    costBasis: 1.00,
    addedDate: TODAY,
    notes: "Cash settlement fund — Fidelity SPAXX",
  },
];

seed.lastUpdated = new Date().toISOString();

writeFileSync(seedPath, JSON.stringify(seed, null, 2));
console.log("\n✓ seed.json written successfully");
