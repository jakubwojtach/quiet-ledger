# Savings

Personal savings & installments tracker as an **Electron** desktop app. Base currency is **PLN**; all money values are stored as **integers in minor units** (grosze / cents). **No Supabase or cloud account required** — everything saves to local SQLite.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run typecheck
npm run build
npm start
```

### Where your data lives

SQLite file: Electron `userData` / `networth.sqlite`

| OS | Typical path |
| --- | --- |
| Linux | `~/.config/savings-net-worth/networth.sqlite` |
| macOS | `~/Library/Application Support/savings-net-worth/networth.sqlite` |
| Windows | `%APPDATA%\savings-net-worth\networth.sqlite` |

Enter amounts in normal units in the UI (e.g. `1500.50`); Zod converts to grosze/cents before save.

### UI tabs

1. **Savings** — total holdings, class breakdown, add/edit/delete assets
2. **Installments** — pożyczki / e-raty (add/edit/delete), expenses, income, cashflow

## Stack

- electron-vite · React 19 · TypeScript · Tailwind · shadcn/ui
- TanStack Query · Zod
- better-sqlite3 in the **main** process

## Architecture

| Layer | Responsibility |
| --- | --- |
| **Main** | SQLite, FX/price fetch, valuation, IPC. Secrets stay here. |
| **Preload** | Typed `window.api`; Zod validates every IPC payload. |
| **Renderer** | React only — no network, no DB. |

## Key paths

| Area | Path |
| --- | --- |
| Schema | `src/main/db/schema.ts` |
| Asset CRUD | `src/main/db/assets.ts` |
| Liability CRUD | `src/main/db/liabilities.ts` |
| Expenses | `src/main/db/expenses.ts` |
| IPC + Zod | `src/shared/ipc.ts` |
| Asset form | `src/renderer/src/components/forms/AssetFormDialog.tsx` |
| Liability form | `src/renderer/src/components/forms/LiabilityFormDialog.tsx` |
| Installments UI | `src/renderer/src/components/Installments.tsx` |
