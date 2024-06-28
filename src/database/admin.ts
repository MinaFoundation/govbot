import { getDb } from './index';

export async function addAdmin(discordUserId: string): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO admins (discord_user_id) VALUES (?)', [discordUserId]);
}

export async function removeAdmin(discordUserId: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM admins WHERE discord_user_id = ?', [discordUserId]);
}

export async function isAdmin(discordUserId: string): Promise<boolean> {
  const db = getDb();
  const admin = await db.get('SELECT * FROM admins WHERE discord_user_id = ?', [discordUserId]);
  return !!admin;
}

export async function addSMECategory(name: string): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO sme_categories (name) VALUES (?)', [name]);
}

export async function addSME(categoryId: number, discordUserId: string): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO smes (category_id, discord_user_id) VALUES (?, ?)', [categoryId, discordUserId]);
}

export async function removeSME(discordUserId: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM smes WHERE discord_user_id = ?', [discordUserId]);
}

export async function addProposalTopic(name: string, details: string): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO proposal_topics (name, details) VALUES (?, ?)', [name, details]);
}

export async function removeProposalTopic(name: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM proposal_topics WHERE name = ?', [name]);
}

export async function setProposalTopicCommittee(topicId: number, smeCategoryId: number, numberOfSMEs: number): Promise<void> {
  const db = getDb();
  await db.run('INSERT OR REPLACE INTO proposal_topic_committee (topic_id, sme_category_id, number_of_smes) VALUES (?, ?, ?)', [topicId, smeCategoryId, numberOfSMEs]);
}

export async function setProposalTopicProposers(topicId: number, smeCategoryId: number): Promise<void> {
  const db = getDb();
  await db.run('INSERT OR REPLACE INTO proposal_topic_proposers (topic_id, sme_category_id) VALUES (?, ?)', [topicId, smeCategoryId]);
}

export async function getSMECategories(): Promise<{ id: number; name: string }[]> {
  const db = getDb();
  return db.all('SELECT id, name FROM sme_categories');
}

export async function getProposalTopics(): Promise<{ id: number; name: string }[]> {
  const db = getDb();
  return db.all('SELECT id, name FROM proposal_topics');
}

export async function getProposalTopicById(id: number): Promise<{ id: number; name: string } | undefined> {
    const db = getDb();
    return db.get('SELECT id, name FROM proposal_topics WHERE id = ?', [id]);
  }