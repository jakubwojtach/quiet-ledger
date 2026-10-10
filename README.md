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

SQLite data lives under the Electron `userData` directory (`networth.sqlite`). First launch seeds demo holdings.

## Key paths

| Area | Path |
| --- | --- |
| Schema / seed | `src/main/db/schema.ts` |
| DB access | `src/main/db/index.ts` |
| Shared types | `src/shared/types.ts` |
| IPC channels + Zod | `src/shared/ipc.ts` |
| Valuation service | `src/main/services/valuation.ts` |
| FX cache | `src/main/services/fx.ts` |
| Equity prices | `src/main/services/prices.ts` |
| Preload API | `src/preload/index.ts` |
| Example UI | `src/renderer/src/components/Dashboard.tsx` |

## Features in this slice

- Dashboard: total net worth in PLN and % breakdown by asset class
- Per-asset detail: native value, PLN value, last updated
- Monthly income log with optional allocation to an asset
- Optimistic TanStack Query mutations (income) with invalidate-on-success
