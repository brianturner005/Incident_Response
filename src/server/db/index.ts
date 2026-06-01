import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dataDir = process.env.DATA_DIR ?? './data'
fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'incidents.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL CHECK(severity IN ('P1','P2','P3','P4')),
    status TEXT NOT NULL DEFAULT 'open'
      CHECK(status IN ('open','investigating','identified','monitoring','resolved')),
    assignee TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,
    jira_ticket_id TEXT,
    jira_ticket_url TEXT,
    slack_message_ts TEXT,
    tags TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    actor TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_timeline_incident_id ON timeline_events(incident_id);
  CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
  CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
`)

const upsertConfig = db.prepare(
  `INSERT INTO config(key, value) VALUES(?, ?) ON CONFLICT(key) DO NOTHING`
)

const envSeeds: Record<string, string> = {
  slack_webhook_url: process.env.SLACK_WEBHOOK_URL ?? '',
  jira_base_url: process.env.JIRA_BASE_URL ?? '',
  jira_email: process.env.JIRA_EMAIL ?? '',
  jira_api_token: process.env.JIRA_API_TOKEN ?? '',
  jira_project_key: process.env.JIRA_PROJECT_KEY ?? '',
  default_slack_channel: process.env.DEFAULT_SLACK_CHANNEL ?? '#incidents',
}

for (const [key, value] of Object.entries(envSeeds)) {
  upsertConfig.run(key, value)
}

export default db
