# Net Worth (Savings)

Personal net worth tracker as an **Electron** desktop app. Base currency is **PLN**; all money values are stored as **integers in minor units** (grosze / cents).

## Stack

- [electron-vite](https://electron-vite.org/) · React 19 · TypeScript · Tailwind CSS · shadcn/ui
- TanStack Query · Zod
- better-sqlite3 in the **main** process (FX/price cache + holdings)

## Architecture

| Layer | Responsibility |
| --- | --- |
| **Main** | SQLite, FX/price fetch, valuation service, IPC handlers. Secrets stay here. |
| **Preload** | Typed `window.api` via `contextBridge`; **Zod validates every IPC payload** before `invoke`. |
| **Renderer** | React UI only — no direct network or database access. |

Security defaults: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP on the renderer session.

FX and equity quotes are cached in SQLite with a **15-minute TTL**. If a fetch fails, the last known value is used (`stale: true`).

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run typecheck   # main + renderer TypeScript
npm run build       # production build
npm start           # preview production build via electron-vite
```

SQLite data lives under the Electron `userData` directory (`networth.sqlite`). First launch seeds demo holdings, liabilities, expense categories, and sample expenses.

### UI tabs

1. **Net worth** — assets, liabilities (principal + monthly payment), net = assets − liabilities, holdings detail
2. **This month** — income, expenses by category, installment cashflow sketch (income − expenses − scheduled installments)

## Key paths

| Area | Path |
| --- | --- |
| Schema / seed | `src/main/db/schema.ts` |
| DB access | `src/main/db/index.ts` |
| Liabilities | `src/main/db/liabilities.ts` |
| Expenses | `src/main/db/expenses.ts` |
| Shared types | `src/shared/types.ts` |
| IPC channels + Zod | `src/shared/ipc.ts` |
| Valuation (net of debt) | `src/main/services/valuation.ts` |
| Month summary | `src/main/services/monthSummary.ts` |
| Local events hook (future HA) | `src/main/hooks/localEvents.ts` |
| Preload API | `src/preload/index.ts` |
| Net worth UI | `src/renderer/src/components/Dashboard.tsx` |
| This month UI | `src/renderer/src/components/ThisMonth.tsx` |

## Features

- Dashboard: net worth in PLN, assets / liabilities / net, % breakdown by asset class
- Liabilities: remaining principal, monthly payment, optional next due
- Per-asset detail: native value, PLN value, last updated
- This month: expense categories + entries, income log, cashflow sketch
- Optimistic TanStack Query mutations with invalidate-on-success
- Thin `emitLocalEvent` hook for a future Home Assistant / MCP integration (no HA built yet)
