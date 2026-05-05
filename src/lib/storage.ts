/**
 * Storage abstraction: uses Vercel KV when env vars are present,
 * falls back to a local JSON file at .data/portfolio.json for local dev.
 */
import { PortfolioData, Bucket, TradeLogEntry } from "./types";
import seedData from "../data/seed.json";

const PORTFOLIO_KEY = "portfolio:main";

function hasKvConfig(): boolean {
  return !!(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

// ─── KV backend ─────────────────────────────────────────────────────────────

async function kvGet(): Promise<PortfolioData | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<PortfolioData>(PORTFOLIO_KEY);
}

async function kvSet(data: PortfolioData): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(PORTFOLIO_KEY, data);
}

// ─── File backend (local dev) ────────────────────────────────────────────────

async function fileGet(): Promise<PortfolioData | null> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(process.cwd(), ".data", "portfolio.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as PortfolioData;
  } catch {
    return null;
  }
}

async function fileSet(data: PortfolioData): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "portfolio.json");
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getPortfolio(): Promise<PortfolioData> {
  const raw = hasKvConfig() ? await kvGet() : await fileGet();
  if (!raw) {
    // First run: seed from seed.json
    const seeded = { ...(seedData as PortfolioData) };
    await savePortfolio(seeded);
    return seeded;
  }
  return raw;
}

export async function savePortfolio(data: PortfolioData): Promise<void> {
  const updated: PortfolioData = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };
  if (hasKvConfig()) {
    await kvSet(updated);
  } else {
    await fileSet(updated);
  }
}

export async function getBucket(id: string): Promise<Bucket | null> {
  const portfolio = await getPortfolio();
  return portfolio.buckets.find((b) => b.id === id) ?? null;
}

export async function updateBucket(
  id: string,
  bucket: Bucket
): Promise<PortfolioData> {
  const portfolio = await getPortfolio();
  const idx = portfolio.buckets.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error(`Bucket ${id} not found`);
  portfolio.buckets[idx] = bucket;
  await savePortfolio(portfolio);
  return portfolio;
}

export async function addTrade(entry: TradeLogEntry): Promise<void> {
  const portfolio = await getPortfolio();
  portfolio.tradeLog = [entry, ...portfolio.tradeLog];
  await savePortfolio(portfolio);
}
