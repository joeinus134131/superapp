BEGIN;
ALTER TABLE integration_events ADD CONSTRAINT finance_event_entity_id UNIQUE(entity_id,id);
CREATE TABLE transaction_candidates (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL, import_id uuid NOT NULL UNIQUE,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 state text NOT NULL DEFAULT 'needs_review' CHECK(state IN ('needs_review','accepted','matched_existing','rejected')),
 journal_id uuid, fields jsonb NOT NULL DEFAULT '{}'::jsonb,
 FOREIGN KEY(entity_id,import_id) REFERENCES integration_events(entity_id,id),
 FOREIGN KEY(entity_id,journal_id) REFERENCES journal_entries(entity_id,id),
 UNIQUE(entity_id,id)
);
CREATE TABLE review_actions (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL, candidate_id uuid NOT NULL,
 actor_user_id uuid NOT NULL REFERENCES users(id), idempotency_key text NOT NULL,
 body_sha256 char(64) NOT NULL, action text NOT NULL,
 previous_revision bigint NOT NULL, new_revision bigint NOT NULL,
 journal_id uuid, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(entity_id,candidate_id) REFERENCES transaction_candidates(entity_id,id),
 FOREIGN KEY(entity_id,journal_id) REFERENCES journal_entries(entity_id,id),
 UNIQUE(entity_id,idempotency_key)
);
CREATE TRIGGER immutable_review_actions BEFORE UPDATE OR DELETE ON review_actions FOR EACH ROW EXECUTE FUNCTION finance_immutable();
-- Existing manually-routed evidence remains unresolved, never auto-posted.
INSERT INTO transaction_candidates(id,entity_id,import_id)
 SELECT id,entity_id,id FROM integration_events WHERE state='needs_review';
COMMIT;
