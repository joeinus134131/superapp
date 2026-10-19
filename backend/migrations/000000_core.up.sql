CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), email text NOT NULL UNIQUE,
 name text, avatar text, password_hash text, "createdAt" timestamptz,
 "updatedAt" timestamptz, last_login timestamptz
);
CREATE TABLE user_contexts (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL,
 module_type text NOT NULL, data_payload jsonb NOT NULL,
 event_timestamp timestamptz DEFAULT CURRENT_TIMESTAMP,
 is_synced_to_ai boolean DEFAULT false, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE leaderboard_entries (
 user_id uuid PRIMARY KEY, name text, avatar text, level bigint,
 total_xp bigint, last_seen timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE squads (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), name text NOT NULL,
 description text, creator_id uuid NOT NULL, member_count bigint DEFAULT 1, created_at timestamptz
);
CREATE TABLE insights (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL,
 insight_type text NOT NULL, content text NOT NULL, related_modules text,
 confidence bigint DEFAULT 80, created_at timestamptz, updated_at timestamptz
);
CREATE INDEX idx_insights_user_id ON insights(user_id);
CREATE TABLE coach_messages (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid NOT NULL,
 title text NOT NULL, body text NOT NULL, type text NOT NULL,
 is_read boolean DEFAULT false, created_at timestamptz, updated_at timestamptz
);
CREATE INDEX idx_coach_messages_user_id ON coach_messages(user_id);
CREATE TABLE challenges (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), squad_id uuid NOT NULL,
 title text NOT NULL, type text, target bigint, stake_xp bigint,
 start_date timestamptz, end_date timestamptz
);
CREATE TABLE challenge_progresses (
 challenge_id uuid, user_id uuid, current bigint, is_completed boolean DEFAULT false,
 updated_at timestamptz, PRIMARY KEY(challenge_id,user_id)
);
