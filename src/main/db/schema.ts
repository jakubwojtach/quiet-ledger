/** SQLite DDL for the net-worth tracker. Amounts are integer minor units. */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY NOT NULL,
  class TEXT NOT NULL CHECK (class IN (
    'etf','bond','retirement','savings_usd','savings_pln','apartment','land','car'
  )),
  name TEXT NOT NULL,
  notes TEXT,
  -- ETF
  ticker TEXT,
  quantity_scaled INTEGER,
  cost_basis_minor INTEGER,
  cost_currency TEXT,
  -- Bond
  nominal_minor INTEGER,
  unit_value_minor INTEGER,
  -- Retirement
  units_scaled INTEGER,
  unit_price_minor INTEGER,
  -- Shared currency / savings / manual
  amount_minor INTEGER,
  currency TEXT,
  valued_on TEXT,
  -- apartment / land / car: 'estimate' | 'manual' | 'otodom' | 'otomoto'
  value_source TEXT,
  -- apartment / land: address + m² for Otodom comps
  address TEXT,
  area_m2 REAL,
  -- car: Otomoto comps
  car_make TEXT,
  car_model TEXT,
  car_year INTEGER,
  car_trim TEXT,
  -- wrapper or institution, e.g. IKE, IKZE Kaja, Broker USD
  account TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS liabilities (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  provider TEXT,
  principal_minor INTEGER NOT NULL,
  monthly_payment_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  next_due_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  date TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  note TEXT,
  liability_id TEXT REFERENCES liabilities(id) ON DELETE SET NULL,
  -- 'due' | 'paid' (existing rows migrate to paid)
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('due', 'paid')),
  due_date TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_cache (
  key TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fx','equity')),
  value_scaled INTEGER NOT NULL,
  quote_currency TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_entries (
  id TEXT PRIMARY KEY NOT NULL,
  month TEXT NOT NULL,
  -- settlement / expected date YYYY-MM-DD
  date TEXT NOT NULL,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  -- PLN per 1 unit × 10_000; PLN = 10000
  fx_rate_scaled INTEGER NOT NULL DEFAULT 10000,
  -- cached PLN equivalent
  pln_amount_minor INTEGER NOT NULL,
  -- 'expected' | 'received'
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('expected', 'received')),
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  income_id TEXT NOT NULL REFERENCES income_entries(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL
);

-- One purchase of an ETF, bond series or fund. When a holding has lots, its
-- quantity / units / nominal and cost basis are the sums of its lots.
CREATE TABLE IF NOT EXISTS asset_lots (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  -- units ×1e6; for bonds the number of bonds
  quantity_scaled INTEGER NOT NULL,
  -- price per unit in price_currency ×1e4
  price_scaled INTEGER,
  price_currency TEXT,
  paid_minor INTEGER NOT NULL,
  paid_currency TEXT NOT NULL,
  -- bond code, e.g. EDO0335
  series TEXT,
  -- 1 when worked out rather than read from a statement (opening balance, NAV-derived units)
  estimated INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- One row per calendar day; written when the dashboard is built.
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  day TEXT PRIMARY KEY NOT NULL,
  assets_minor INTEGER NOT NULL,
  liabilities_minor INTEGER NOT NULL,
  net_worth_minor INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);

-- Cash in / out for savings accounts (PLN & USD). Balance = deposits − withdrawals.
CREATE TABLE IF NOT EXISTS asset_movements (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('deposit', 'withdrawal')),
  -- Always stored positive; sign comes from kind
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL,
  -- 1 when seeded from a pre-existing balance so derived total matches
  estimated INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_class ON assets(class);
CREATE INDEX IF NOT EXISTS idx_asset_lots_asset ON asset_lots(asset_id, date);
CREATE INDEX IF NOT EXISTS idx_asset_movements_asset ON asset_movements(asset_id, date);
CREATE INDEX IF NOT EXISTS idx_income_month ON income_entries(month);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_entries(date);
CREATE INDEX IF NOT EXISTS idx_price_cache_fetched ON price_cache(fetched_at);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_day ON net_worth_snapshots(day);
`

/**
 * Default expense category labels only — not personal holdings.
 * A fresh database also gets the Fort Wola apartment (see ensureRealData.ts).
 * Scaffold demo rows (ETF, loans, generic land/car) are not inserted.
 */
export const DEFAULT_CATEGORIES_SQL = `
INSERT OR IGNORE INTO expense_categories (id, name, sort_order) VALUES
  ('b1111111-1111-4111-8111-111111111111', 'Food', 1),
  ('b2222222-2222-4222-8222-222222222222', 'Transport', 2),
  ('b3333333-3333-4333-8333-333333333333', 'Housing', 3),
  ('b4444444-4444-4444-8444-444444444444', 'Utilities', 4),
  ('b5555555-5555-4555-8555-555555555555', 'Other', 5);
`
