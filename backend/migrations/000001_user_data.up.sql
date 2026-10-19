CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key VARCHAR(160) NOT NULL,
    payload JSONB NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision > 0),
    checksum VARCHAR(64) NOT NULL,
    client_updated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_data_owner_key UNIQUE (user_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_user_data_user_updated ON user_data(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS data_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    item_count INTEGER NOT NULL CHECK (item_count >= 0),
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_data_migration_owner_key UNIQUE (user_id, idempotency_key)
);
