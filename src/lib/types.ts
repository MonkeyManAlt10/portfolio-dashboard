export interface Position {
  ticker: string;
  shares: number;
  costBasis: number;
  addedDate: string;
  notes?: string;
}

export interface Bucket {
  id: string;
  name: string;
  category: "retirement" | "brokerage" | "savings";
  color: string;
  description?: string;
  positions: Position[];
}

export interface TradeLogEntry {
  id: string;
  timestamp: string;
  bucketId: string;
  action: "BUY" | "SELL" | "ADJUST";
  ticker: string;
  shares: number;
  price: number;
  notes?: string;
}

export interface ClosedPosition {
  id: string;
  ticker: string;
  shares: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  costBasis: number;
  proceeds: number;
  realizedGain: number;
  gainPercent: number;
  holdingPeriod: "short" | "long";
  firstBuyDate: string;
  lastSellDate: string;
  notes?: string;
}

export interface RothSettings {
  annualContributionLimit: number;
  contributedThisYear: number;
  totalContributed: number;
  projectionRates: number[];
  retirementAge: number;
  currentAge: number;
}

export interface PortfolioData {
  owner: string;
  buckets: Bucket[];
  tradeLog: TradeLogEntry[];
  closedPositions: ClosedPosition[];
  rothSettings: RothSettings;
  lastUpdated: string;
}

// Enriched types returned by the API (includes live price data)
export interface EnrichedPosition extends Position {
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  daysHeld: number;
  marketState?: string;
  isMutualFund?: boolean;
  lastPriceDate?: string;
}

export interface EnrichedBucket extends Omit<Bucket, "positions"> {
  positions: EnrichedPosition[];
  totalValue: number | null;
  totalCostBasis: number;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
  todayChange: number | null;
  todayChangePct: number | null;
}

export interface EnrichedPortfolio extends Omit<PortfolioData, "buckets"> {
  buckets: EnrichedBucket[];
  grandTotal: number | null;
  grandTotalCostBasis: number;
  grandTotalGainLoss: number | null;
  grandTotalGainLossPct: number | null;
  marketState?: string;
  realizedYTD: number;
}

export interface QuoteData {
  price: number;
  currency: string;
  marketState: string;
  lastUpdated: string;
  isMutualFund: boolean;
  lastPriceDate?: string;
  todayChange?: number;
  todayChangePct?: number;
}
