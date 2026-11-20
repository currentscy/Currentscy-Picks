-- Currentscy Picks prediction ledger v1. Apply in Cloudflare D1 after creating database.
CREATE TABLE IF NOT EXISTS prediction_snapshots (
 id TEXT PRIMARY KEY,
 league TEXT NOT NULL CHECK(league IN ('nfl','ncaa')),
 game_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 market TEXT NOT NULL,
 threshold REAL NOT NULL,
 kickoff_utc TEXT NOT NULL,
 recorded_at_utc TEXT NOT NULL,
 model_version TEXT NOT NULL,
 baseline_probability REAL NOT NULL CHECK(baseline_probability BETWEEN 0 AND 1),
 coaching_probability REAL NOT NULL CHECK(coaching_probability BETWEEN 0 AND 1),
 baseline_projection REAL,
 coaching_projection REAL,
 source_url TEXT NOT NULL,
 source_payload_hash TEXT NOT NULL,
 CHECK(recorded_at_utc < kickoff_utc)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_game ON prediction_snapshots(league,game_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_player ON prediction_snapshots(league,game_id,player_id);
CREATE TABLE IF NOT EXISTS player_results (
 league TEXT NOT NULL,
 game_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 market TEXT NOT NULL,
 actual_value REAL NOT NULL,
 final_status TEXT NOT NULL CHECK(final_status='final'),
 source_url TEXT NOT NULL,
 verified_at_utc TEXT NOT NULL,
 PRIMARY KEY(league,game_id,player_id,market)
);
CREATE TABLE IF NOT EXISTS audit_scores (
 snapshot_id TEXT PRIMARY KEY REFERENCES prediction_snapshots(id),
 actual_value REAL NOT NULL,
 outcome INTEGER NOT NULL CHECK(outcome IN (0,1)),
 baseline_brier REAL NOT NULL,
 coaching_brier REAL NOT NULL,
 scored_at_utc TEXT NOT NULL
);
