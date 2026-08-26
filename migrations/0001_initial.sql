PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  profile_image TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_name TEXT NOT NULL,
  school_code TEXT NOT NULL,
  office_code TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class_number INTEGER NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('teacher','president','vice_president','member')),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted','pending')),
  invited_at TEXT,
  joined_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id,user_id)
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  meal_date TEXT NOT NULL,
  menu TEXT NOT NULL,
  UNIQUE(class_id,meal_date)
);

CREATE TABLE IF NOT EXISTS timetables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_date TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject TEXT NOT NULL,
  UNIQUE(class_id,class_date,period)
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  schedule_date TEXT NOT NULL,
  schedule_time TEXT,
  type TEXT NOT NULL DEFAULT 'class' CHECK(type IN ('class','exam','event'))
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'class',
  title TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  supply_date TEXT NOT NULL,
  item TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_user ON class_members(user_id,status);
CREATE INDEX IF NOT EXISTS idx_members_class ON class_members(class_id,status);
CREATE INDEX IF NOT EXISTS idx_schedules_class_date ON schedules(class_id,schedule_date);
CREATE INDEX IF NOT EXISTS idx_notices_class_created ON notices(class_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplies_class_date ON supplies(class_id,supply_date);
