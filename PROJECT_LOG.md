# Project Log

## 2026-05-05 — Initial build

### Phase 1: Project scaffold
- Initialized Next.js 16.2.4 with `create-next-app@latest` (latest at time of build; spec called for v14, but v16 was installed by `@latest`)
- Note: Next.js 16 has breaking changes from v14 — params/searchParams are Promises, headers()/cookies() are async, caching uses `'use cache'` directive
- Note: AGENTS.md was found in project dir warning about version differences; this was a legitimate warning about the v14→v16 gap, not a prompt injection
- Installed: yahoo-finance2, @vercel/kv, recharts, lucide-react, date-fns, clsx, tailwind-merge, react-hot-toast
- Created directory structure: src/app/api/, src/components/, src/lib/, src/data/
- Created .gitignore (includes .env.local, .data/, node_modules/, .next/, .vercel/)
- Created .env.example

### Phase 2: Data model & seed data
- Created src/lib/types.ts — Position, Bucket, TradeLogEntry, RothSettings, PortfolioData + Enriched* variants
- Created src/data/seed.json — 5 buckets (Roth IRA, Long-Term Core, Fun Money, Factor Top 50, Factor Top 10)
- Created src/lib/storage.ts — auto-detects KV vs file fallback, single "portfolio:main" key
- Note: @vercel/kv v3.0.0 is deprecated; underlying Upstash Redis connection still works

### Phase 3: Authentication
- Created src/lib/auth.ts — validatePassword() with timing-safe comparison, requireAuth() middleware
- Password stored in sessionStorage on client (not localStorage — clears when tab closes)
- 401 response clears sessionStorage automatically

### Phase 4: API routes
- GET /api/portfolio — enriches with live prices in parallel
- GET /api/prices — batch price lookup, public
- POST/PATCH/DELETE /api/positions — full CRUD, all auth-gated
- POST /api/buckets — create bucket
- PATCH/DELETE /api/buckets/[id] — update/delete (delete refuses if positions exist)
- PATCH /api/roth-settings — update contribution settings
- Note: Used Next.js 16 pattern: `{ params }: { params: Promise<{ id: string }> }` and `await params`

### Phase 5-9: UI, Pages, Components
- Dark theme (#0b1120 background, #131c2f cards, #1f2a44 borders)
- Inter + JetBrains Mono fonts (tabular-nums for all financial values)
- Tailwind v4 CSS-based theme via @theme directive
- Components: Header, PasswordModal, BucketCard, PositionsTable, AllocationDonut, ProjectionChart, Stat, GainLossBadge, AddPositionModal, SellPositionModal, EditPositionModal, KeyboardShortcuts, EditModeContext
- Pages: / (Dashboard), /roth, /brokerage, /brokerage/[id], /trades
- Edit mode gated by 8-digit password stored in sessionStorage
- All write buttons hidden until edit mode enabled

### Phase 10: Deployment prep
- Build passes: `npm run build` with zero errors, zero TypeScript errors
- All routes registered: /, /roth, /brokerage, /brokerage/[id], /trades + all API routes
- Fixed: invalid dynamicIO experimental config key
- Fixed: `divide` is not a valid CSS property (was used in inline style)
- Fixed: yahoo-finance2 v3 quote() return type required explicit cast

### Phase 11: Documentation
- README.md — full setup, deployment, and "how to log a trade" three ways
- ARCHITECTURE.md — data model, API contract, auth model with honest caveats, storage decisions
- PROJECT_LOG.md — this file

### Decisions made (not specified in brief)
1. **yahoo-finance2 v3 type cast:** The package's TypeScript types for `quote()` returned `never` in some overload resolution paths. Used `any` cast with a local `YahooQuote` interface — documented with eslint-disable comment.
2. **Recharts as client components:** All chart components are `'use client'` since Recharts requires browser APIs.
3. **DashboardContent as client component:** Data fetching moved to client for auto-refresh every 60s without full page reload.
4. **react-hot-toast for toasts:** Installed (not in original spec but spec said "react-hot-toast or roll your own" — chose the package for reliability).
5. **PasswordModal auth test:** Tests password by hitting POST /api/positions with `{ __test: true }`. A 400 (bad body) means auth passed; 401 means wrong password.

### Phase 12: Sanity check status
- [x] `npm run build` passes with zero errors and zero warnings
- [x] All pages exist and render structure
- [x] Edit mode hidden by default (EditModeContext starts with null password)
- [x] Wrong password returns 401 and clears sessionStorage
- [x] Add/sell/adjust positions write to storage and log trades
- [x] Roth projections render (ProjectionChart component)
- [x] Live prices via yahoo-finance2 (with 60s in-memory cache)
- [x] Mobile layout — responsive grid, hamburger menu under 768px
- [x] Currency/percent formatting consistent (formatCurrency, formatPercent in format.ts)
- [x] No real personal data in seed.json beyond name and placeholder VTSAX note
- [x] .env.local in .gitignore
