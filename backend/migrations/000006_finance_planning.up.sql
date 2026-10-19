BEGIN;
CREATE TABLE financial_goals (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id),
 display_name text NOT NULL, currency char(3) NOT NULL,
 target numeric NOT NULL CHECK(target>0 AND target<1e26 AND scale(target)<=8), due_date date NOT NULL,
 UNIQUE(entity_id,id)
);
CREATE TABLE goal_allocations (
 entity_id uuid NOT NULL, goal_id uuid NOT NULL, account_id uuid NOT NULL,
 amount numeric NOT NULL CHECK(amount>=0 AND amount<1e26 AND scale(amount)<=8),
 revision bigint NOT NULL CHECK(revision>0),
 FOREIGN KEY(entity_id,goal_id) REFERENCES financial_goals(entity_id,id),
 FOREIGN KEY(entity_id,account_id) REFERENCES financial_accounts(entity_id,id),
 PRIMARY KEY(goal_id,account_id)
);
CREATE TABLE planning_actions (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id), actor_user_id uuid NOT NULL REFERENCES users(id),
 idempotency_key text NOT NULL, body_sha256 char(64) NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entity_id,idempotency_key)
);
CREATE TRIGGER immutable_planning_actions BEFORE UPDATE OR DELETE ON planning_actions FOR EACH ROW EXECUTE FUNCTION finance_immutable();
CREATE TABLE planning_runs (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id), actor_user_id uuid NOT NULL REFERENCES users(id),
 idempotency_key text NOT NULL, body_sha256 char(64) NOT NULL, input jsonb NOT NULL, output jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entity_id,actor_user_id,idempotency_key)
);
CREATE TRIGGER immutable_planning_runs BEFORE UPDATE OR DELETE ON planning_runs FOR EACH ROW EXECUTE FUNCTION finance_immutable();
COMMIT;
