-- SGBAU Result Watch — SQLite schema
-- Designed to be portable to PostgreSQL later (plain types, no SQLite-only features
-- beyond AUTOINCREMENT, which maps cleanly to SERIAL/IDENTITY).

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  university           TEXT NOT NULL DEFAULT 'SGBAU',
  roll_number          TEXT NOT NULL,
  student_name         TEXT,
  course               TEXT NOT NULL,          -- e.g. B.Tech
  branch               TEXT NOT NULL,           -- e.g. Computer Science & Engineering
  curriculum           TEXT,                    -- e.g. NEP
  semester              TEXT NOT NULL,          -- e.g. 4
  exam_type            TEXT NOT NULL,           -- Regular | Back | Reval | EVS
  exam_session         TEXT NOT NULL,           -- e.g. Summer 2026
  academic_year        TEXT,
  monitoring_enabled   INTEGER NOT NULL DEFAULT 1,
  monitoring_interval  INTEGER NOT NULL DEFAULT 2, -- minutes (default 2 min)
  active_window_enabled INTEGER NOT NULL DEFAULT 0, -- 0 = 24/7, 1 = specific hours only
  active_window_start  TEXT DEFAULT '16:00',       -- HH:MM in IST (default 4:00 PM)
  active_window_end    TEXT DEFAULT '20:00',       -- HH:MM in IST (default 8:00 PM)
  last_checked_at      TEXT,
  next_check_at        TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_monitoring ON student_profiles(monitoring_enabled, next_check_at);

CREATE TABLE IF NOT EXISTS results (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  student_profile_id     INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  result_hash            TEXT NOT NULL,
  result_date            TEXT,
  semester               TEXT,
  exam_type              TEXT,
  exam_session           TEXT,
  academic_year          TEXT,
  sgpa                   REAL,
  cgpa                   REAL,
  percentage             REAL,
  backlogs               INTEGER,
  result_status          TEXT NOT NULL, -- RESULT_NOT_DECLARED | RESULT_FOUND | RESULT_PROCESSING | RESULT_VERIFIED | RESULT_FAILED | RESULT_REQUIRES_VERIFICATION
  raw_source_reference   TEXT,   -- URL / description of where this was retrieved from
  source_method          TEXT,   -- 'auto_scrape' | 'manual_upload' | 'mock'
  pdf_path               TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_profile_id, result_hash)
);

CREATE INDEX IF NOT EXISTS idx_results_profile ON results(student_profile_id);

CREATE TABLE IF NOT EXISTS subjects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id       INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  subject_code    TEXT,
  subject_name    TEXT,
  credits         REAL,
  internal_marks  REAL,
  external_marks  REAL,
  total_marks     REAL,
  grade           TEXT,
  grade_point     REAL,
  status          TEXT
);

CREATE INDEX IF NOT EXISTS idx_subjects_result ON subjects(result_id);

CREATE TABLE IF NOT EXISTS monitoring_logs (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  student_profile_id   INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
  checked_at           TEXT NOT NULL DEFAULT (datetime('now')),
  status               TEXT NOT NULL, -- success | not_declared | error | timeout | requires_verification
  message              TEXT,
  duration_ms          INTEGER,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_profile ON monitoring_logs(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_logs_checked_at ON monitoring_logs(checked_at);

CREATE TABLE IF NOT EXISTS notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result_id      INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'email',
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | sent | disabled | error
  sent_at        TEXT,
  error_message  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique ON notifications(result_id, type);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
