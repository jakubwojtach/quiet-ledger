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

CREATE INDEX IF NOT EXISTS idx_assets_class ON assets(class);
CREATE INDEX IF NOT EXISTS idx_income_month ON income_entries(month);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense_entries(date);
CREATE INDEX IF NOT EXISTS idx_price_cache_fetched ON price_cache(fetched_at);
`

/** Seed demo holdings so the dashboard is usable on first launch. */
export const SEED_ASSETS_SQL = `
INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  ticker, quantity_scaled, cost_basis_minor, cost_currency,
  currency, created_at, updated_at
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'etf', 'VWCE accumulating', NULL,
  'VWCE.DE', 12500000, 4500000, 'EUR',
  'EUR', '2024-01-15T10:00:00.000Z', '2024-01-15T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  nominal_minor, unit_value_minor, currency,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  'bond', 'Polish treasury 2028', NULL,
  10000000, 9850, 'PLN',
  '2024-03-01T10:00:00.000Z', '2024-03-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  units_scaled, unit_price_minor, currency,
  created_at, updated_at
) VALUES (
  '33333333-3333-4333-8333-333333333333',
  'retirement', 'PPE / IKE fund', NULL,
  850000000, 1250, 'PLN',
  '2023-06-01T10:00:00.000Z', '2025-09-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  amount_minor, currency,
  created_at, updated_at
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  'savings_usd', 'USD emergency buffer', NULL,
  850000, 'USD',
  '2024-02-01T10:00:00.000Z', '2024-02-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  amount_minor, currency,
  created_at, updated_at
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  'savings_pln', 'PLN current account', NULL,
  2450000, 'PLN',
  '2024-02-01T10:00:00.000Z', '2024-02-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  amount_minor, currency, valued_on,
  created_at, updated_at
) VALUES (
  '66666666-6666-4666-8666-666666666666',
  'apartment', 'Warsaw apartment', NULL,
  890000000, 'PLN', '2025-06-01',
  '2022-01-01T10:00:00.000Z', '2025-06-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  amount_minor, currency, valued_on,
  created_at, updated_at
) VALUES (
  '77777777-7777-4777-8777-777777777777',
  'land', 'Plot near Kraków', NULL,
  180000000, 'PLN', '2024-11-15',
  '2021-05-01T10:00:00.000Z', '2024-11-15T10:00:00.000Z'
);

INSERT OR IGNORE INTO assets (
  id, class, name, notes,
  amount_minor, currency, valued_on,
  created_at, updated_at
) VALUES (
  '88888888-8888-4888-8888-888888888888',
  'car', 'Family car', NULL,
  4500000, 'PLN', '2025-08-01',
  '2023-04-01T10:00:00.000Z', '2025-08-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO price_cache (key, kind, value_scaled, quote_currency, fetched_at) VALUES
  ('FX:USD:PLN', 'fx', 39500, 'PLN', '2025-10-01T12:00:00.000Z'),
  ('FX:EUR:PLN', 'fx', 42800, 'PLN', '2025-10-01T12:00:00.000Z'),
  ('EQ:VWCE.DE', 'equity', 11850, 'EUR', '2025-10-01T12:00:00.000Z');
`

export const SEED_LIABILITIES_SQL = `
INSERT OR IGNORE INTO liabilities (
  id, name, provider, principal_minor, monthly_payment_minor, currency, next_due_date, notes, created_at, updated_at
) VALUES (
  'a1111111-1111-4111-8111-111111111111',
  'Phone e-raty', 'Play', 240000, 20000, 'PLN', '2026-11-01', '24 months remaining',
  '2025-01-10T10:00:00.000Z', '2025-10-01T10:00:00.000Z'
);

INSERT OR IGNORE INTO liabilities (
  id, name, provider, principal_minor, monthly_payment_minor, currency, next_due_date, notes, created_at, updated_at
) VALUES (
  'a2222222-2222-4222-8222-222222222222',
  'Consumer loan', 'mBank', 1850000, 45000, 'PLN', '2026-10-15', NULL,
  '2024-06-01T10:00:00.000Z', '2025-10-01T10:00:00.000Z'
);
`

export const SEED_CATEGORIES_SQL = `
INSERT OR IGNORE INTO expense_categories (id, name, sort_order) VALUES
  ('b1111111-1111-4111-8111-111111111111', 'Food', 1),
  ('b2222222-2222-4222-8222-222222222222', 'Transport', 2),
  ('b3333333-3333-4333-8333-333333333333', 'Housing', 3),
  ('b4444444-4444-4444-8444-444444444444', 'Utilities', 4),
  ('b5555555-5555-4555-8555-555555555555', 'Other', 5);
`

/** @deprecated use SEED_ASSETS_SQL — kept so older imports keep working during edits */
export const SEED_SQL = SEED_ASSETS_SQL
