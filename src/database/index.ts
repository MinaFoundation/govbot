import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any;

export async function initializeDatabase() {
  db = await open({
    filename: './govbot.sqlite',
    driver: sqlite3.Database
  });

  await initializeAdminTables();
  // Add other initialization functions for different categories here
}

async function initializeAdminTables() {
  const CREATE_ADMINS_TABLE = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_user_id TEXT UNIQUE NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const CREATE_SME_CATEGORIES_TABLE = `
    CREATE TABLE IF NOT EXISTS sme_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const CREATE_SMES_TABLE = `
    CREATE TABLE IF NOT EXISTS smes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      discord_user_id TEXT NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES sme_categories(id),
      UNIQUE(category_id, discord_user_id)
    );
  `;

  const CREATE_PROPOSAL_TOPICS_TABLE = `
    CREATE TABLE IF NOT EXISTS proposal_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      details TEXT,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const CREATE_PROPOSAL_TOPIC_COMMITTEE_TABLE = `
    CREATE TABLE IF NOT EXISTS proposal_topic_committee (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      sme_category_id INTEGER NOT NULL,
      number_of_smes INTEGER NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES proposal_topics(id),
      FOREIGN KEY (sme_category_id) REFERENCES sme_categories(id),
      UNIQUE(topic_id, sme_category_id)
    );
  `;

  const CREATE_PROPOSAL_TOPIC_PROPOSERS_TABLE = `
    CREATE TABLE IF NOT EXISTS proposal_topic_proposers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      sme_category_id INTEGER NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES proposal_topics(id),
      FOREIGN KEY (sme_category_id) REFERENCES sme_categories(id),
      UNIQUE(topic_id, sme_category_id)
    );
  `;

  const CREATE_TEMPORARY_STORAGE_TABLE = `
  CREATE TABLE IF NOT EXISTS temporary_storage (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`;

  const statements = [
    CREATE_ADMINS_TABLE,
    CREATE_SME_CATEGORIES_TABLE,
    CREATE_SMES_TABLE,
    CREATE_PROPOSAL_TOPICS_TABLE,
    CREATE_PROPOSAL_TOPIC_COMMITTEE_TABLE,
    CREATE_PROPOSAL_TOPIC_PROPOSERS_TABLE,
    CREATE_TEMPORARY_STORAGE_TABLE
  ];

  for (const statement of statements) {
    await db.exec(statement);
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}