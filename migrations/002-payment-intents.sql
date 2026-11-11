ALTER TABLE payments ALTER COLUMN tx_id TYPE TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_cost_date DATE DEFAULT CURRENT_DATE;
CREATE TABLE IF NOT EXISTS payment_failures (
    id SERIAL PRIMARY KEY,
    error_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchase_intents (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    provider TEXT NOT NULL CHECK (provider IN ('stars', 'platega')),
    provider_tx_id TEXT UNIQUE,
    package_name TEXT NOT NULL,
    text_count INTEGER NOT NULL CHECK (text_count >= 0),
    image_count INTEGER NOT NULL CHECK (image_count >= 0),
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('RUB', 'XTR')),
    fulfilled_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS purchase_intents_pending ON purchase_intents(created_at) WHERE fulfilled_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_user_history ON messages(user_id, id DESC);
CREATE INDEX IF NOT EXISTS users_referrer ON users(referred_by);
