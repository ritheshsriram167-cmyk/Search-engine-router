-- ==============================================================================
-- RELAY SEARCH ENGINE ROTOR - SUPABASE PERMANENT DATABASE SCHEMA
-- Execute this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Client Access Keys (permanent client credentials / "APK" keys)
CREATE TABLE IF NOT EXISTS client_keys (
    id TEXT PRIMARY KEY,
    raw_key TEXT UNIQUE NOT NULL,
    masked_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ
);

-- Index for instant key lookup on every incoming search request
CREATE INDEX IF NOT EXISTS idx_client_keys_raw_key ON client_keys (raw_key);

-- 2. Brain Classifier Keys (Gemini API keys pool)
CREATE TABLE IF NOT EXISTS brain_keys (
    id TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    masked_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'rate-limited' | 'failed'
    failure_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    cooldown_until TIMESTAMPTZ
);

-- 3. Providers (Categories: News, Search, Data, Database, etc.)
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    endpoint_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Provider Keys (API keys pool per provider)
CREATE TABLE IF NOT EXISTS provider_keys (
    id TEXT PRIMARY KEY,
    provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    masked_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'rate-limited' | 'failed'
    failure_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    cooldown_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_provider_id ON provider_keys (provider_id);

-- 5. Request Activity & Routing Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    client_key_id TEXT,
    query TEXT,
    category TEXT,
    provider_id TEXT,
    brain_key_id TEXT,
    provider_key_id TEXT,
    latency_ms INT,
    status TEXT DEFAULT 'success'
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs (timestamp DESC);

-- Seed default initial providers if table is empty
INSERT INTO providers (id, name, category) VALUES
    ('p1', 'News', 'News & media'),
    ('p2', 'Search', 'Web search'),
    ('p3', 'Data', 'Structured data'),
    ('p4', 'Database', 'Database lookup')
ON CONFLICT (id) DO NOTHING;
