const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const configuredPath = process.env.DATABASE_PATH || './data/bot.sqlite';
const dbPath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '!',
    welcome_enabled INTEGER NOT NULL DEFAULT 0,
    welcome_channel_id TEXT NOT NULL DEFAULT '',
    welcome_message TEXT NOT NULL DEFAULT 'Welcome {user} to {server}!',
    moderation_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, name)
  );
`);

const getSettingsStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const insertSettingsStmt = db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)');

function getSettings(guildId) {
  insertSettingsStmt.run(guildId);
  return getSettingsStmt.get(guildId);
}

function updateSettings(guildId, values) {
  getSettings(guildId);
  db.prepare(`
    UPDATE guild_settings
    SET prefix = @prefix,
        welcome_enabled = @welcome_enabled,
        welcome_channel_id = @welcome_channel_id,
        welcome_message = @welcome_message,
        moderation_enabled = @moderation_enabled,
        updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = @guild_id
  `).run({ guild_id: guildId, ...values });
  return getSettings(guildId);
}

function listCustomCommands(guildId) {
  return db.prepare('SELECT id, name, response FROM custom_commands WHERE guild_id = ? ORDER BY name').all(guildId);
}

function addCustomCommand(guildId, name, response) {
  db.prepare(`
    INSERT INTO custom_commands (guild_id, name, response)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, name) DO UPDATE SET response = excluded.response
  `).run(guildId, name, response);
}

function deleteCustomCommand(guildId, name) {
  return db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?').run(guildId, name).changes > 0;
}

function getCustomCommand(guildId, name) {
  return db.prepare('SELECT name, response FROM custom_commands WHERE guild_id = ? AND name = ?').get(guildId, name);
}

module.exports = { db, getSettings, updateSettings, listCustomCommands, addCustomCommand, deleteCustomCommand, getCustomCommand };
