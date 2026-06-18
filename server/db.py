"""Postgres connection pool + schema for baby.stephens.page.

Multi-tenant: data is scoped to a household. Users belong to one household and
share its data. Events are an append-mostly log with a client-generated UUID and
a monotonic `seq` (set by trigger on insert AND update) that drives cursor sync;
deletes are tombstones (`deleted_at`) so they propagate. Settings is one
last-write-wins doc per household.
"""
from __future__ import annotations

import os
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ["DATABASE_URL"]

pool: ConnectionPool | None = None  # set in init_pool()


def init_pool() -> None:
    global pool
    pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=8, kwargs={"row_factory": dict_row})
    with pool.connection() as conn:
        conn.execute(SCHEMA)


SCHEMA = """
CREATE TABLE IF NOT EXISTS households (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email           text NOT NULL,
    password_hash   text,
    display_name    text NOT NULL,
    role            text NOT NULL DEFAULT 'member',   -- owner | member
    email_verified  boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_household ON users (household_id);

CREATE TABLE IF NOT EXISTS email_tokens (
    id          bigserial PRIMARY KEY,
    kind        text NOT NULL,                        -- verify | reset | magic
    email       text NOT NULL,
    user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text NOT NULL,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_tokens_hash ON email_tokens (token_hash);

CREATE TABLE IF NOT EXISTS invites (
    id          bigserial PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email       text NOT NULL,
    token_hash  text NOT NULL,
    invited_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    expires_at  timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invites_hash ON invites (token_hash);

CREATE TABLE IF NOT EXISTS push_devices (
    id          bigserial PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transport   text NOT NULL DEFAULT 'webpush',      -- webpush | fcm | apns
    endpoint    text,
    p256dh      text,
    auth        text,
    token       text,                                 -- native push token (future)
    created_at  timestamptz NOT NULL DEFAULT now(),
    last_seen   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_devices_endpoint ON push_devices (endpoint) WHERE endpoint IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS events_seq;
CREATE TABLE IF NOT EXISTS events (
    id          uuid PRIMARY KEY,                     -- client-generated
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    seq         bigint NOT NULL DEFAULT nextval('events_seq'),
    type        text NOT NULL,
    ts          timestamptz NOT NULL,
    data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    note        text,
    logged_by   text,
    created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    deleted_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_household_seq ON events (household_id, seq);

CREATE OR REPLACE FUNCTION events_bump_seq() RETURNS trigger AS $fn$
BEGIN
    NEW.seq := nextval('events_seq');
    NEW.updated_at := now();
    RETURN NEW;
END $fn$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS events_seq_trg ON events;
CREATE TRIGGER events_seq_trg BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION events_bump_seq();

CREATE TABLE IF NOT EXISTS settings (
    household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
    data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    version     int NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders_sent (
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    kind        text NOT NULL,        -- appt:<event_id> | feed
    sent_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (household_id, kind)
);
"""
