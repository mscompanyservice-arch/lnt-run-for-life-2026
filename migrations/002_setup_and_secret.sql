-- One-time owner setup code (hash only) and server secret stored in the database
-- (used by deployments that cannot hold environment secrets, e.g. the Supabase Edge deployment).
CREATE TABLE setup_code (
  id          INT PRIMARY KEY CHECK (id = 1),
  code_hash   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at     TIMESTAMPTZ
);
CREATE TABLE app_secret (
  id     INT PRIMARY KEY CHECK (id = 1),
  value  TEXT NOT NULL
);
