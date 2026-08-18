const fs = require("node:fs");
const path = require("node:path");
const sqliteModule = process.getBuiltinModule?.("node:sqlite") || require("node:sqlite");
const { DatabaseSync } = sqliteModule;

const DEMO_USERS = [
  { name: "Lucía Morales", role: "client" },
  { name: "Mateo Castillo", role: "client" },
  { name: "Valentina Reyes", role: "admin" }
];

function createDatabase(databasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  seedDemoUsers(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('client', 'admin')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS demo_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY,
      property_code TEXT NOT NULL,
      project_id INTEGER,
      project_name TEXT,
      project_address TEXT,
      project_location TEXT,
      type TEXT,
      class_type TEXT,
      model TEXT,
      area REAL,
      price REAL,
      suggested_price REAL,
      location TEXT,
      status TEXT,
      completion_date TEXT,
      phase TEXT,
      blocked_until TEXT,
      bedrooms INTEGER,
      bathrooms INTEGER,
      parking_spaces INTEGER,
      construction_area REAL,
      length REAL,
      width REAL,
      year INTEGER,
      title TEXT,
      description TEXT,
      details TEXT,
      short_description TEXT,
      features TEXT,
      latitude REAL,
      longitude REAL,
      images_json TEXT NOT NULL DEFAULT '[]',
      quality_flags_json TEXT NOT NULL DEFAULT '[]',
      source_json TEXT NOT NULL,
      source_updated_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_properties_active_type ON properties(is_active, type);
    CREATE INDEX IF NOT EXISTS idx_properties_active_price ON properties(is_active, price);
    CREATE INDEX IF NOT EXISTS idx_properties_project_name ON properties(project_name);
    CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
    CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code);

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_message_id INTEGER,
      assistant_message_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pendiente', 'respondida', 'error', 'cancelada')),
      error_code TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_conversation ON interactions(conversation_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interaction_id TEXT NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS message_property_sources (
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id),
      PRIMARY KEY(message_id, property_id)
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL CHECK(status IN ('pendiente', 'respondida', 'error')),
      property_count INTEGER NOT NULL DEFAULT 0,
      error_code TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);
}

function seedDemoUsers(db) {
  const count = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (count) return;

  const insert = db.prepare("INSERT INTO users (name, role, created_at) VALUES (?, ?, ?)");
  const now = new Date().toISOString();
  for (const user of DEMO_USERS) {
    insert.run(user.name, user.role, now);
  }
}

function transaction(db, operation) {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = operation();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

module.exports = { createDatabase, transaction };
