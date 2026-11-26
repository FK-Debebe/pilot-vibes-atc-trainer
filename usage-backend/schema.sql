PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS people (
 id TEXT PRIMARY KEY, google_sub TEXT UNIQUE, display_name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('guest','member')),
 country TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
 active_seconds INTEGER NOT NULL DEFAULT 0 CHECK(active_seconds>=0),
 created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL, last_credit_ms INTEGER NOT NULL,
 owner INTEGER NOT NULL DEFAULT 0, nonce_hash TEXT, nonce_expires INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_person ON sessions(person_id);
CREATE TABLE IF NOT EXISTS usage_batches (
 id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL, seconds INTEGER NOT NULL CHECK(seconds BETWEEN 0 AND 90), received_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS credit_usage AFTER INSERT ON usage_batches BEGIN
 UPDATE people SET active_seconds=active_seconds+NEW.seconds,last_seen=NEW.received_at WHERE id=NEW.person_id;
 UPDATE sessions SET last_credit_ms=NEW.received_at WHERE token_hash=NEW.session_hash;
END;
