// src/utils/temporaryStorage.ts

import { getDb } from '../database';

interface StorageItem {
  value: string;
  expiresAt: number;
}

class TemporaryStorage {
  private storage: Map<string, StorageItem>;
  private readonly TTL_MS: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.storage = new Map();
  }

  async set(key: string, value: string): Promise<void> {
    const expiresAt = Date.now() + this.TTL_MS;
    this.storage.set(key, { value, expiresAt });

    // Persist to database
    const db = getDb();
    await db.run('INSERT OR REPLACE INTO temporary_storage (key, value, expires_at) VALUES (?, ?, ?)', [key, value, expiresAt]);
  }

  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
    
    if (item && item.expiresAt > Date.now()) {
      return item.value;
    }

    // If not in memory, check DB
    const db = getDb();
    const dbItem = await db.get('SELECT value, expires_at FROM temporary_storage WHERE key = ?', [key]);
    
    if (dbItem && dbItem.expires_at > Date.now()) {
      this.storage.set(key, { value: dbItem.value, expiresAt: dbItem.expires_at });
      return dbItem.value;
    }

    // If expired or not found, remove from storage and database
    this.storage.delete(key);
    await db.run('DELETE FROM temporary_storage WHERE key = ?', [key]);
    
    return null;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
    
    // Remove from database
    const db = getDb();
    await db.run('DELETE FROM temporary_storage WHERE key = ?', [key]);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, item] of this.storage.entries()) {
      if (item.expiresAt <= now) {
        this.storage.delete(key);
      }
    }

    // Clean up database
    const db = getDb();
    await db.run('DELETE FROM temporary_storage WHERE expires_at <= ?', [now]);
  }
}

export const temporaryStorage = new TemporaryStorage();