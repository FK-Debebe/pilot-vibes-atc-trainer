-- Run ONCE against the existing database, before deploying the V6.30 Worker.
ALTER TABLE usage_batches ADD COLUMN mode TEXT NOT NULL DEFAULT 'unknown' CHECK(mode IN ('vfr','ifr','unknown'));

CREATE TABLE IF NOT EXISTS usage_daily (
 person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
 day TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('vfr','ifr','unknown')),
 active_seconds INTEGER NOT NULL DEFAULT 0 CHECK(active_seconds>=0),
 PRIMARY KEY(person_id,day,mode)
);
CREATE INDEX IF NOT EXISTS usage_daily_day ON usage_daily(day,mode,person_id);
CREATE TABLE IF NOT EXISTS usage_metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT OR IGNORE INTO usage_metadata VALUES('daily_since',strftime('%Y-%m-%dT%H:%M:%SZ','now'));
CREATE TRIGGER IF NOT EXISTS credit_daily_usage AFTER INSERT ON usage_batches WHEN NEW.seconds>0 BEGIN
 INSERT INTO usage_daily(person_id,day,mode,active_seconds)
 VALUES(NEW.person_id,strftime('%Y-%m-%d',NEW.received_at/1000,'unixepoch'),NEW.mode,NEW.seconds)
 ON CONFLICT(person_id,day,mode) DO UPDATE SET active_seconds=active_seconds+excluded.active_seconds;
END;
