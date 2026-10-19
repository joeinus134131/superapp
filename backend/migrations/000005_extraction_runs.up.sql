BEGIN;
CREATE TABLE extraction_runs (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL, import_id uuid NOT NULL,
 parser_id text NOT NULL, parser_version text NOT NULL, schema_version text NOT NULL CHECK(schema_version='1'),
 output jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(entity_id,import_id) REFERENCES integration_events(entity_id,id),
 UNIQUE(import_id,parser_id,parser_version)
);
CREATE TRIGGER immutable_extraction_runs BEFORE UPDATE OR DELETE ON extraction_runs FOR EACH ROW EXECUTE FUNCTION finance_immutable();
COMMIT;
