PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant', 'admin')),
  plan TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  tenant_user_id TEXT,
  tenant_name TEXT NOT NULL DEFAULT '',
  tenant_email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  rent_amount REAL NOT NULL CHECK (rent_amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('vacant', 'pending', 'paid', 'late')),
  due_day INTEGER,
  paid_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  tenant_user_id TEXT,
  tenant_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL CHECK (amount >= 0),
  date_received TEXT NOT NULL,
  move_in_date TEXT NOT NULL,
  move_out_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('held', 'returned', 'dispute')),
  return_deadline TEXT,
  returned_date TEXT,
  return_amount REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  tenant_user_id TEXT,
  tenant_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'completed')),
  submitted_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  completed_date TEXT,
  assigned_to_user_id TEXT,
  images_json TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  tenant_user_id TEXT,
  tenant_name TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
  timestamp TEXT NOT NULL,
  receipt_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS walkthroughs (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  tenant_user_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('not-started', 'in-progress', 'completed')),
  started_date TEXT,
  completed_date TEXT,
  instructions TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS walkthrough_rooms (
  id TEXT PRIMARY KEY,
  walkthrough_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  photos_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (walkthrough_id) REFERENCES walkthroughs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_properties_owner_user_id ON properties(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant_user_id ON units(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_property_id ON deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_deposits_unit_id ON deposits(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_user_id ON maintenance_requests(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit_id ON payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_unit_id ON walkthroughs(unit_id);
CREATE INDEX IF NOT EXISTS idx_walkthrough_rooms_walkthrough_id ON walkthrough_rooms(walkthrough_id);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);