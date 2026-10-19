-- Apply explicitly through the deployment migration step; never AutoMigrate finance.
BEGIN;
CREATE TABLE finance_entities (
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL REFERENCES users(id),
 kind text NOT NULL CHECK (kind IN ('personal','business','family')),
 display_name text NOT NULL, base_currency char(3) NOT NULL,
 state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','archived'))
);
CREATE TABLE entity_memberships (
 entity_id uuid NOT NULL REFERENCES finance_entities(id), user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK (role IN ('owner','editor','viewer')), revoked_at timestamptz,
 PRIMARY KEY(entity_id,user_id)
);
CREATE TABLE financial_accounts (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id),
 kind text NOT NULL CHECK (kind IN ('bank','cash','ewallet','asset','liability','equity','income','expense')),
 display_name text NOT NULL, currency char(3) NOT NULL, masked_identifier text,
 state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','archived')),
 UNIQUE(entity_id,id), UNIQUE(entity_id,id,currency)
);
CREATE TABLE integration_connections (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id),
 provider text NOT NULL, token_sha256 char(64) NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'disabled' CHECK (state IN ('active','disabled','revoked')),
 UNIQUE(entity_id,id)
);
CREATE TABLE integration_events (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL, connection_id uuid NOT NULL,
 event_id uuid NOT NULL, idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 1 AND 128),
 body_sha256 char(64) NOT NULL, provider_message_id text NOT NULL, content_sha256 char(64) NOT NULL,
 payload jsonb NOT NULL, state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','processing','needs_review','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(entity_id,connection_id) REFERENCES integration_connections(entity_id,id),
 UNIQUE(connection_id,idempotency_key), UNIQUE(connection_id,event_id), UNIQUE(connection_id,provider_message_id)
);
CREATE TABLE durable_jobs (
 id uuid PRIMARY KEY, import_id uuid NOT NULL UNIQUE REFERENCES integration_events(id),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz
);
CREATE TABLE outbox_events (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id),
 event_type text NOT NULL, payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz
);
CREATE INDEX durable_jobs_pending ON durable_jobs(available_at) WHERE state='queued';
CREATE TABLE journal_entries (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id),
 kind text NOT NULL CHECK(kind IN ('opening','transfer','standard','reversal')),
 effective_date date NOT NULL, idempotency_key text NOT NULL, body_sha256 char(64) NOT NULL,
 reversal_of uuid, posted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(entity_id,id), UNIQUE(entity_id,idempotency_key), UNIQUE(reversal_of),
 FOREIGN KEY(entity_id,reversal_of) REFERENCES journal_entries(entity_id,id)
);
CREATE TABLE journal_lines (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL, entry_id uuid NOT NULL, account_id uuid NOT NULL,
 currency char(3) NOT NULL, side text NOT NULL CHECK(side IN ('debit','credit')),
 amount numeric NOT NULL CHECK(amount > 0 AND amount < 1e26 AND scale(amount)<=8),
 FOREIGN KEY(entity_id,entry_id) REFERENCES journal_entries(entity_id,id),
 FOREIGN KEY(entity_id,account_id,currency) REFERENCES financial_accounts(entity_id,id,currency)
);
-- Deferred check permits insertion of all lines in a single transaction.
CREATE FUNCTION finance_check_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 target := NEW.id;
 IF (SELECT count(*) FROM journal_lines WHERE entry_id=target)<2 OR EXISTS (
 SELECT currency FROM journal_lines WHERE entry_id=target GROUP BY currency
 HAVING sum(CASE side WHEN 'debit' THEN amount ELSE -amount END) <> 0
 ) THEN RAISE EXCEPTION 'unbalanced journal'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER journal_balanced AFTER INSERT ON journal_entries
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance_check_balance();
CREATE FUNCTION finance_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'posted journal is immutable; use reversal'; END $$;
CREATE TRIGGER immutable_entries BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION finance_immutable();
CREATE TRIGGER immutable_lines BEFORE UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION finance_immutable();
-- Prevent appending lines after the posting transaction (including balanced additions).
CREATE FUNCTION finance_line_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=NEW.entry_id AND xmin::text=pg_current_xact_id()::text)
 THEN RAISE EXCEPTION 'cannot append to posted journal'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER journal_line_insert BEFORE INSERT ON journal_lines FOR EACH ROW EXECUTE FUNCTION finance_line_insert();
COMMIT;
