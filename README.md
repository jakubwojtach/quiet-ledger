# Quiet Ledger

Local-first personal **net worth & cashflow** desktop app (Electron). Base currency is **PLN**; amounts are stored as integer minor units (grosze / cents). **No cloud account** — data lives in local SQLite on your machine.

**Site:** [jakubwojtach.github.io/quiet-ledger](https://jakubwojtach.github.io/quiet-ledger/)  
**Repo:** [github.com/jakubwojtach/quiet-ledger](https://github.com/jakubwojtach/quiet-ledger)

## Features

- **Savings** — holdings (ETFs, funds, cash, property, cars), paid vs worth, history
- **Installments** — income, expenses, loans / e-raty, monthly cashflow
- **Live sources** — Yahoo, analizy.pl, Frankfurter FX; Otodom comps (property), Otomoto comps (cars)
- **Privacy** — optional portal logins in OS secure storage; never baked into the installer

## Run locally

Node.js 20+ and npm:

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build:mac      # DMG + zip under dist/
npm run build:win      # Windows (best on Windows / CI)
npm run db:reset       # wipe local SQLite (explicit; never auto)
```

### Data location

`appId` `com.quietledger.app` · folder `quiet-ledger` · file `networth.sqlite`

| OS | Path |
| --- | --- |
| macOS | `~/Library/Application Support/quiet-ledger/networth.sqlite` |
| Linux | `~/.config/quiet-ledger/networth.sqlite` |
| Windows | `%APPDATA%\quiet-ledger\networth.sqlite` |

On first launch after the rename, the DB is **copied** from `savings-net-worth` if present.

## CI / releases

| Workflow | What it does |
| --- | --- |
| **CI** | Typecheck on push / PR |
| **GitHub Pages** | Deploys `site/` → project Pages |
| **Release builds** | macOS + Windows artifacts (`workflow_dispatch` or tag `v*`) |

Enable **Settings → Pages → Source: GitHub Actions** once after the first push. Download Windows builds from the Actions run artifacts (or Releases when you attach them).

## Stack

electron-vite · React 19 · TypeScript · Tailwind · TanStack Query · Zod · better-sqlite3 (main process)

## Architecture

| Layer | Role |
| --- | --- |
| **Main** | SQLite, prices / comps, valuation, IPC, secrets |
| **Preload** | Typed `window.api`; Zod on every IPC payload |
| **Renderer** | React only — no network, no DB |
