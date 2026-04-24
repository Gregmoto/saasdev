-- importModeEnum
CREATE TYPE import_mode AS ENUM ('create_only','update_existing','create_and_update');
-- import_conflict_resolution
CREATE TYPE import_conflict_resolution AS ENUM ('pending','keep_existing','use_incoming');

-- Add columns to import_jobs
ALTER TABLE import_jobs
  ADD COLUMN import_mode import_mode NOT NULL DEFAULT 'create_only',
  ADD COLUMN progress jsonb NOT NULL DEFAULT '{}'::jsonb;

-- import_conflicts table
CREATE TABLE import_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_account_id uuid NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  entity varchar(50) NOT NULL,
  external_id varchar(255) NOT NULL,
  internal_id uuid NOT NULL,
  conflict_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolution import_conflict_resolution NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_conflicts_store_account_id_idx ON import_conflicts(store_account_id);
CREATE INDEX import_conflicts_job_id_idx ON import_conflicts(job_id);
CREATE INDEX import_conflicts_job_entity_resolution_idx ON import_conflicts(job_id, entity, resolution);
