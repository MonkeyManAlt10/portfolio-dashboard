# Architecture

## Data model

All data lives in a single `PortfolioData` object stored at key `portfolio:main`.

```typescript
interface PortfolioData {
  owner: string;
  buckets: Bucket[];        // ordered list of accounts
  tradeLog: TradeLogEntry[]; // prepend-only, newest first
  rothSettings: RothSettings;
  lastUpdated: string;       // ISO datetime, updated on every write
}

interface Bucket {
  id: string;               // url-safe slug, e.g. "roth-ira"
  name: string;             // display name
  category: "retirement" | "brokerage" | "savings";
  color: string;            // hex accent for UI
  description?: string;
  positions: Position[];
}

interface Position {
  ticker: string;           // uppercased, e.g. "VTSAX"
  shares: number;           // fractional-safe float
  costBasis: number;        // average cost per share
  addedDate: string;        // ISO date "2024-01-15"
  notes?: string;
}

interface TradeLogEntry {
  id: string;               // UUID
  timestamp: string;        // ISO datetime
  bucketId: string;
  action: "BUY" | "SELL" | "ADJUST";
  ticker: string;
  shares: number;
  price: number;            // per share
  notes?: string;
}
```

The API enriches this at read time — `currentPrice`, `currentValue`, `gainLoss`, `gainLossPct` are derived from live Yahoo Finance data and never persisted.

---

## API contract

All routes return `application/json`. Errors: `{ error: string }` with appropriate HTTP status.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/portfolio` | No | Full portfolio enriched with live prices |
| GET | `/api/prices?tickers=X,Y` | No | Batch price lookup |
| POST | `/api/positions` | Yes | Add a position |
| PATCH | `/api/positions` | Yes | Update a position |
| DELETE | `/api/positions` | Yes | Sell/remove a position |
| POST | `/api/buckets` | Yes | Create a new bucket |
| PATCH | `/api/buckets/[id]` | Yes | Update bucket metadata |
| DELETE | `/api/buckets/[id]` | Yes | Delete bucket (must be empty) |
| PATCH | `/api/roth-settings` | Yes | Update Roth contribution settings |

**Auth header:** `x-edit-password: <8-digit-password>`

---

## Auth model

### What it protects against

- Casual visitors accidentally (or intentionally) modifying your positions through the public UI
- Bots hitting write endpoints without the password

### What it does NOT protect against

- A determined attacker with network access who can brute-force 8 digits (100 million possibilities, no rate limiting implemented)
- Someone with your Vercel dashboard access — they can read/modify the KV data directly
- Server-side request forgery from the same origin

This is "casual security" appropriate for a personal site on Vercel where:
1. The data is not financially sensitive in the attack surface sense (no real account credentials, no trade execution)
2. The edit form is hidden from the public UI unless unlocked
3. The cost of a breach is at most some wrong numbers in your dashboard

**Not appropriate for:** Any situation with multiple users, real financial consequences, or compliance requirements.

### Implementation details

- Password stored as `EDIT_PASSWORD` env var (Vercel-managed, not in code)
- Compared using a timing-safe character-by-character XOR to prevent timing attacks
- Frontend stores password in `sessionStorage` (cleared when tab closes)
- On 401 response, frontend clears sessionStorage and shows error

---

## Storage decisions

### Why Vercel KV (Redis) over Postgres

- **Volume:** One user, one JSON blob, updated a few times per month. Postgres is massive overkill.
- **Latency:** KV reads are ~5ms vs ~20-50ms for a Postgres query on Vercel's network.
- **Cost:** KV has a generous free tier; Postgres on Vercel Postgres is more expensive.
- **Simplicity:** A single `kv.get("portfolio:main")` / `kv.set(...)` is trivially simple. No migrations, no schema, no ORM.

### Why a single key for the whole portfolio

- The entire portfolio is under 1MB even with 100+ positions and years of trade history.
- Atomic reads/writes prevent partial-state bugs (no distributed transactions needed).
- Makes seeding, debugging, and manual edits straightforward (copy/paste the whole blob).

### Why file-based fallback for local dev

- Vercel KV requires credentials. Setting up KV locally just to run the dashboard is friction.
- The `.data/portfolio.json` fallback means `npm run dev` works immediately after cloning with only `EDIT_PASSWORD` set.
- The file is gitignored to prevent accidentally committing personal data.

---

## Price data

- **Source:** yahoo-finance2 npm package (unofficial Yahoo Finance API wrapper)
- **Caching:** Server-side in-memory Map, 60-second TTL
- **Mutual funds (VTSAX, etc.):** Priced once daily at market close. The UI shows "Last close: YYYY-MM-DD" rather than a fake "live" indicator.
- **Error handling:** One bad ticker doesn't block others — fetches run in parallel with `Promise.allSettled`, and a null result is handled gracefully throughout the UI.
