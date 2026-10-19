-- init.sql: SelfOne Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE module_type_enum AS ENUM (
    'FINANCE', 
    'HEALTH', 
    'TASK', 
    'HABIT', 
    'JOURNAL', 
    'GOALS'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
);

CREATE TABLE user_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_type module_type_enum NOT NULL,
    data_payload JSONB NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_synced_to_ai BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_context_user_id ON user_context(user_id);
CREATE INDEX idx_user_context_module_type ON user_context(module_type);
CREATE INDEX idx_user_context_event_time ON user_context(event_timestamp DESC);
CREATE INDEX idx_user_context_payload ON user_context USING GIN (data_payload);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_context_modtime
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
