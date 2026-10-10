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
  -- apartment / land / car: 'estimate' (catalog formula) or 'manual'
  value_source TEXT,
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
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  income_id TEXT NOT NULL REFERENCES income_entries(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_class ON assets(class);
CREATE INDEX IF NOT EXISTS idx_income_month ON income_entries(month);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_entries(date);
CREATE INDEX IF NOT EXISTS idx_price_cache_fetched ON price_cache(fetched_at);
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
