BEGIN;
CREATE TABLE source_documents (
 id uuid PRIMARY KEY, entity_id uuid NOT NULL REFERENCES finance_entities(id), actor_user_id uuid NOT NULL REFERENCES users(id),
 idempotency_key text NOT NULL, content_sha256 char(64) NOT NULL, mime text NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes>0 AND size_bytes<=10485760), object_key text NOT NULL UNIQUE,
 storage_driver text NOT NULL CHECK(storage_driver='local-private-staging'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entity_id,idempotency_key), UNIQUE(entity_id,id)
);
CREATE TRIGGER immutable_source_documents BEFORE UPDATE OR DELETE ON source_documents FOR EACH ROW EXECUTE FUNCTION finance_immutable();
COMMIT;
