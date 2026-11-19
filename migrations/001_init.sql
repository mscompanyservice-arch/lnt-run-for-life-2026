-- LNT RUN FOR LIFE 2026 — initial schema (PostgreSQL 13+)
-- Money is stored as BIGINT in LAK (ກີບ). No floating point anywhere.

CREATE TABLE settings (
  id          INT PRIMARY KEY CHECK (id = 1),
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  BIGINT
);

CREATE TABLE categories (
  code          TEXT PRIMARY KEY CHECK (code IN ('general','senior','family')),
  name_lo       TEXT NOT NULL,
  distance_km   INT  NOT NULL,
  base_fee      BIGINT NOT NULL CHECK (base_fee >= 0),
  base_members  INT  NOT NULL CHECK (base_members >= 1),
  extra_fee     BIGINT NOT NULL CHECK (extra_fee >= 0),
  min_members   INT  NOT NULL CHECK (min_members >= 1),
  max_members   INT  NOT NULL CHECK (max_members >= min_members),
  min_age       INT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((code = 'general' AND distance_km = 10) OR (code IN ('senior','family') AND distance_km = 5))
);

CREATE TABLE staff (
  id             BIGSERIAL PRIMARY KEY,
  username       TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('owner','accountant','staff')),
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX staff_username_uq ON staff (lower(username));

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  staff_id    BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_staff_idx ON sessions (staff_id);

CREATE TABLE registrations (
  id                   BIGSERIAL PRIMARY KEY,
  reference            TEXT NOT NULL UNIQUE,
  access_hash          TEXT NOT NULL,
  idempotency_key      TEXT NOT NULL UNIQUE,
  request_fingerprint  TEXT NOT NULL,
  reg_type             TEXT NOT NULL CHECK (reg_type IN ('individual','family')),
  category_code        TEXT NOT NULL REFERENCES categories(code),
  distance_km          INT  NOT NULL,
  team_name            TEXT,
  contact_name         TEXT NOT NULL,
  contact_phone        TEXT NOT NULL,
  contact_phone_norm   TEXT NOT NULL,
  emergency_name       TEXT,
  emergency_phone      TEXT,
  note                 TEXT,
  consent_at           TIMESTAMPTZ NOT NULL,
  member_count         INT NOT NULL CHECK (member_count >= 1),
  fee_base             BIGINT NOT NULL CHECK (fee_base >= 0),
  fee_base_members     INT NOT NULL,
  fee_extra_each       BIGINT NOT NULL CHECK (fee_extra_each >= 0),
  fee_extra_count      INT NOT NULL CHECK (fee_extra_count >= 0),
  total_amount         BIGINT NOT NULL CHECK (total_amount = fee_base + fee_extra_each * fee_extra_count),
  priced_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_status       TEXT NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid','awaiting_review','confirmed','rejected')),
  confirmed_amount     BIGINT CHECK (confirmed_amount >= 0),
  confirmed_at         TIMESTAMPTZ,
  confirmed_by         BIGINT REFERENCES staff(id),
  payment_note         TEXT,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  cancelled_at         TIMESTAMPTZ,
  cancelled_by         BIGINT REFERENCES staff(id),
  cancel_reason        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((category_code = 'general' AND distance_km = 10) OR (category_code IN ('senior','family') AND distance_km = 5)),
  CHECK ((reg_type = 'family') = (category_code = 'family')),
  CHECK (payment_status <> 'confirmed' OR (confirmed_amount IS NOT NULL AND confirmed_at IS NOT NULL))
);
CREATE INDEX registrations_phone_idx    ON registrations (contact_phone_norm);
CREATE INDEX registrations_payment_idx  ON registrations (payment_status);
CREATE INDEX registrations_category_idx ON registrations (category_code);
CREATE INDEX registrations_status_idx   ON registrations (status);
CREATE INDEX registrations_team_idx     ON registrations (lower(team_name));
CREATE INDEX registrations_created_idx  ON registrations (created_at DESC);

CREATE TABLE participants (
  id                BIGSERIAL PRIMARY KEY,
  registration_id   BIGINT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  position          INT NOT NULL,
  full_name         TEXT NOT NULL,
  gender            TEXT NOT NULL CHECK (gender IN ('male','female')),
  dob               DATE NOT NULL,
  shirt_size        TEXT NOT NULL,
  bib               TEXT,
  bib_assigned_at   TIMESTAMPTZ,
  kit_collected_at  TIMESTAMPTZ,
  kit_collected_by  BIGINT REFERENCES staff(id),
  checked_in_at     TIMESTAMPTZ,
  checked_in_by     BIGINT REFERENCES staff(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id, position)
);
-- One BIB per runner across the whole event; enforced by the database so concurrent requests cannot both win.
CREATE UNIQUE INDEX participants_bib_uq ON participants (upper(bib)) WHERE bib IS NOT NULL;
CREATE INDEX participants_reg_idx  ON participants (registration_id);
CREATE INDEX participants_name_idx ON participants (lower(full_name));

CREATE TABLE payment_proofs (
  id               BIGSERIAL PRIMARY KEY,
  registration_id  BIGINT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  content_type     TEXT NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  byte_size        INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  sha256           TEXT NOT NULL,
  data             BYTEA NOT NULL,
  review_status    TEXT NOT NULL DEFAULT 'pending'
                   CHECK (review_status IN ('pending','accepted','rejected','superseded')),
  reviewed_by      BIGINT REFERENCES staff(id),
  reviewed_at      TIMESTAMPTZ,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payment_proofs_reg_idx ON payment_proofs (registration_id);

-- Append-only financial history (never deleted, survives cancellation).
CREATE TABLE payment_events (
  id               BIGSERIAL PRIMARY KEY,
  registration_id  BIGINT NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  action           TEXT NOT NULL CHECK (action IN ('proof_uploaded','confirmed','rejected','reopened')),
  amount           BIGINT,
  note             TEXT,
  staff_id         BIGINT REFERENCES staff(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_reg_idx ON payment_events (registration_id);

CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  staff_id     BIGINT REFERENCES staff(id),
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,
  details      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx  ON audit_log (entity_type, entity_id);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

-- Public images set by the owner (logo, event images, payment QR). Payment proofs are NOT stored here.
CREATE TABLE assets (
  id            BIGSERIAL PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('logo','event_image','payment_qr')),
  content_type  TEXT NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  byte_size     INT NOT NULL,
  data          BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial configuration (fees from the event brief). Unknown details stay NULL = "not configured".
INSERT INTO categories (code, name_lo, distance_km, base_fee, base_members, extra_fee, min_members, max_members, min_age, sort_order) VALUES
  ('general', 'ລຸ້ນທົ່ວໄປ',  10, 380000, 1, 0,      1, 1,  NULL, 1),
  ('senior',  'ລຸ້ນອາວຸໂສ', 5,  330000, 1, 0,      1, 1,  48,   2),
  ('family',  'ລຸ້ນ Family', 5,  880000, 3, 299000, 3, 20, NULL, 3);

INSERT INTO settings (id, data) VALUES (1, jsonb_build_object(
  'eventName', 'LNT RUN FOR LIFE 2026',
  'eventDate', '2026-12-26',
  'province', 'ແຂວງຫຼວງນ້ຳທາ, ສປປ ລາວ',
  'meetingPoint', NULL,
  'meetingTime', NULL,
  'registrationOpen', true,
  'registrationDeadline', NULL,
  'capacity', NULL,
  'bankName', NULL,
  'bankAccountName', NULL,
  'bankAccountNumber', NULL,
  'paymentQrAssetId', NULL,
  'whatsapp', NULL,
  'contactNote', NULL,
  'logoAssetId', NULL,
  'eventImageAssetIds', '[]'::jsonb,
  'benefits', NULL,
  'instructions', NULL,
  'shirtSizes', '["XS","S","M","L","XL","2XL","3XL"]'::jsonb
));
