-- Legacy rows cannot prove their original request; retry with a new key after
-- explicit preview rather than falsely accepting a changed historical replay.
ALTER TABLE data_migrations ADD COLUMN IF NOT EXISTS request_sha256 varchar(64);
