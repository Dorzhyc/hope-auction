-- 001_init.sql (idempotent-ish)
CREATE TABLE IF NOT EXISTS auction_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  winners_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auction_settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS lots (
  id              SERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  start_price     INTEGER NOT NULL CHECK (start_price > 0),
  current_price   INTEGER NOT NULL CHECK (current_price > 0),
  bids_count      INTEGER NOT NULL DEFAULT 0 CHECK (bids_count >= 0),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','ended')),
  winner_nickname TEXT NULL,
  winning_amount  INTEGER NULL,
  winning_bid_id  BIGINT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lot_images (
  id          SERIAL PRIMARY KEY,
  lot_id      INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bids (
  id            BIGSERIAL PRIMARY KEY,
  lot_id        INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  amount        INTEGER NOT NULL CHECK (amount > 0),
  status        TEXT NOT NULL CHECK (status IN ('accepted','rejected')),
  reject_reason TEXT NULL,
  client_ip     TEXT NULL,
  user_agent    TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_lot_created ON bids(lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_ip_created ON bids(client_ip, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_ip   TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger-like updated_at (simple approach: do it in app on updates)
