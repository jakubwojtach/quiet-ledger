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
npm run db:reset   # wipe local SQLite (explicit; never auto)
```

A fresh database seeds **only your real assets**: Fort Wola 12B/23 (apartment) and the Nefrytowa plot in Szczecin (land). Expense category labels are inserted so the expense form has options. Scaffold demo rows (ETF, loans, generic land/car) are not inserted, and those fixed ids are removed if an older file still has them.

The dev process prints the SQLite path on boot (`[savings-net-worth] SQLite …`). The same path is shown under the tab bar.

### Where your data lives

The app pins `userData` to `savings-net-worth` in both dev and packaged builds (`appId` `com.savings.networth`, product name Savings Net Worth). File name: `networth.sqlite`.

| OS | Current path (this is the file the app opens) |
| --- | --- |
| macOS | `~/Library/Application Support/savings-net-worth/networth.sqlite` |
| Linux | `~/.config/savings-net-worth/networth.sqlite` |
| Windows | `%APPDATA%\savings-net-worth\networth.sqlite` |

Older builds could write a different folder. `npm run db:reset` deletes `networth.sqlite` (and `-wal` / `-shm`) in **all** of these, on the current OS:

| Folder | Why it exists |
| --- | --- |
| `savings-net-worth` | Current app |
| `ev-scaffold` | Old `electron-builder` product name |
| `Electron` | Dev binary before the app set its own folder |

| OS | Legacy paths |
| --- | --- |
| macOS | `~/Library/Application Support/ev-scaffold/networth.sqlite`, `~/Library/Application Support/Electron/networth.sqlite` |
| Linux | `~/.config/ev-scaffold/networth.sqlite`, `~/.config/Electron/networth.sqlite` |
| Windows | `%APPDATA%\ev-scaffold\networth.sqlite`, `%APPDATA%\Electron\networth.sqlite` |

Quit the app, run `npm run db:reset`, then `npm run dev`. The new file contains only Fort Wola and Nefrytowa.

Worth now comes from local catalog formulas in `src/shared/marketCatalog.ts`, not live scrapes. Fort Wola uses the ul. Fort Wola transaction median (October 2026). Nefrytowa uses the median asking price of three building plots on that street (October 2026). Asking prices likely run above actual sale prices. Cars use the same paid vs worth fields once you enter the numbers.

### Live prices

Fetched by the main process and cached in SQLite for 15 minutes. If a fetch fails, the last cached quote is used and marked stale.

| Holding | Source |
| --- | --- |
| ETF / ETC | Yahoo Finance chart endpoint (unofficial, no key). Ticker = Yahoo symbol: `VWCE.DE`, `ISAC.L`, `ETFBM40TR.WA` |
| Polish fund (IKE/IKZE) | analizy.pl NAV, by fund code (`ING80K`) |
| USD / EUR → PLN | Frankfurter (ECB rates) |
| Treasury bonds, cash, car | No API: statement / balance / manual value with a date |

Holdings other than Fort Wola and Nefrytowa live only in the local SQLite file. They are not in source code. `npm run db:reset` copies the file to `networth.sqlite.bak-<timestamp>` before deleting it.

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
| Schema / Fort Wola ensure | `src/main/db/schema.ts`, `src/main/db/ensureRealData.ts` |
| Catalog / formulas | `src/shared/marketCatalog.ts`, `src/shared/valuationFormulas.ts` |
| Asset CRUD | `src/main/db/assets.ts` |
| Liability CRUD | `src/main/db/liabilities.ts` |
| Expenses | `src/main/db/expenses.ts` |
| IPC + Zod | `src/shared/ipc.ts` |
| Asset form | `src/renderer/src/components/forms/AssetFormDialog.tsx` |
| Liability form | `src/renderer/src/components/forms/LiabilityFormDialog.tsx` |
| Installments UI | `src/renderer/src/components/Installments.tsx` |
