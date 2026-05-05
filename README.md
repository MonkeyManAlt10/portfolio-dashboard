# Austin Krauskopf — Portfolio Dashboard

A personal investment dashboard tracking a Roth IRA, brokerage accounts, and factor strategy paper-trading. Live prices from Yahoo Finance, dark-mode Bloomberg-terminal aesthetic, 8-digit password gate for edits.

---

## What it looks like

| Page | Description |
|------|-------------|
| **Dashboard** `/` | Total portfolio value hero, allocation donut chart, bucket cards, top movers, recent trades |
| **Roth IRA** `/roth` | Positions table, contribution tracker, 30-year growth projection chart, insights |
| **Brokerage** `/brokerage` | Card grid of all brokerage accounts |
| **Bucket detail** `/brokerage/[id]` | Full positions table with sorting, edit actions, trade history |
| **Trade Log** `/trades` | Full searchable/filterable trade history, CSV export |

---

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Vercel KV (Redis)** — live position data
- **yahoo-finance2** — live stock/ETF/mutual fund prices
- **Recharts** — allocation donut + Roth projection chart
- **Lucide React** — icons
- **react-hot-toast** — toast notifications
- **Vercel** — hosting (free tier)

---

## Architecture

```
Browser (public read / password-gated edits)
Next.js 16 App Router — React Server Components + Client islands
   │
   ├── API Routes (/api/*)
   │     portfolio   → enriches positions with live prices
   │     prices      → batch Yahoo Finance quote fetching (60s cache)
   │     positions   → CRUD on individual positions (auth required)
   │     buckets     → CRUD on accounts (auth required)
   │     roth-settings → update contribution/projection settings
   │
   ├── Storage layer (src/lib/storage.ts)
   │     KV available → Vercel KV (Redis), key: "portfolio:main"
   │     KV missing   → .data/portfolio.json (local dev file fallback)
   │
   └── Prices layer (src/lib/prices.ts)
         60-second server-side in-memory cache per ticker
         Mutual funds (VTSAX etc.) show "Last close: <date>"
```

---

## Setup (local dev)

**Prerequisites:** Node.js 18+

```bash
# 1. Clone
git clone <your-repo-url>
cd portfolio-dashboard

# 2. Install dependencies
npm install

# 3. Create local env file
cp .env.example .env.local
# Edit .env.local — set EDIT_PASSWORD to any 8 digits, e.g.:
# EDIT_PASSWORD=12345678

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

Local mode uses `.data/portfolio.json` as storage — no Vercel KV needed. The file is auto-created and seeded on first run.

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel auto-detects Next.js — click **Deploy**
4. After deploy, go to **Storage** tab → **Create** → **KV (Redis)** → Create and link to project (adds `KV_*` env vars automatically). Alternatively use an Upstash Redis integration from the Vercel Marketplace.
5. Go to **Settings → Environment Variables** → add `EDIT_PASSWORD = <your 8-digit code>`
6. Redeploy (picks up new env vars)
7. Visit your URL → click **Edit Mode** → enter password → test

> **Note:** `@vercel/kv` is the deprecated package name; the underlying Upstash Redis connection still works. If Vercel prompts you to migrate, follow their guide.

---

## How to log a trade

### Option 1 — Website edit form (easiest)

1. Open the dashboard in your browser
2. Click **Edit Mode** in the top-right header
3. Enter your 8-digit password
4. Navigate to the relevant bucket and use the Add Position / Sell / Edit buttons

### Option 2 — Claude Code in the terminal

Start a Claude Code session in this project directory and say something like:

> "I bought 15 shares of AAPL at $195.40 in my Fun Money account on May 3rd"

Claude Code will look up the bucket ID, issue an authenticated `POST /api/positions` with the correct password from your `.env.local`, and confirm.

Other examples:
> "I sold all my VTSAX in the Roth IRA at today's price"
> "Update my VTSAX cost basis to $152.30"

### Option 3 — Direct database

The portfolio is stored as a single JSON object under key `portfolio:main` in Vercel KV. You can edit it directly via the Vercel KV dashboard or Upstash console. Maintain valid JSON per the schema in `ARCHITECTURE.md`.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `g d` | Go to Dashboard |
| `g r` | Go to Roth IRA |
| `g b` | Go to Brokerage |
| `g t` | Go to Trade Log |
| `?` | Show shortcuts help |

---

## Limitations

- **Mutual funds (VTSAX, VTIAX, etc.)** only price once daily at market close
- **Yahoo Finance** is unofficial — stable but could break (low risk)
- **Single-user, single-password** — not for shared use
- **No brokerage API integration** — manual entry only

---

## Future ideas

- Email/SMS alerts when a position moves more than X%
- Historical snapshots (daily portfolio value over time)
- Benchmark comparison (portfolio vs. SPY)
- More factor strategy tracking tools
- Automatic trade import from brokerage CSV exports
