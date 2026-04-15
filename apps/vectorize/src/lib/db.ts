import { and, eq } from 'drizzle-orm';
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import type { Env } from '../types';
import { item, rssFeed } from '../drizzle/schema';
import { defaultRssFeeds } from '../constants';

/**
 * Initializes the client with the provided environment.
 *
 * @param env - The environment object containing various services.
 * @returns The initialized client.
 */
export function initializeDB(env: Env) {
  return drizzle(env.DB);
}

export async function getActiveRssFeeds(db: DrizzleD1Database) {
  const feeds = await db
    .select({ url: rssFeed.url })
    .from(rssFeed)
    .where(eq(rssFeed.isActive, true));

  return feeds.length ? feeds.map((feed) => feed.url) : defaultRssFeeds;
}

export async function addRssFeed(db: DrizzleD1Database, url: string) {
  await db
    .insert(rssFeed)
    .values({ url, isActive: true })
    .onConflictDoUpdate({
      target: rssFeed.url,
      set: { isActive: true, updatedAt: new Date() },
    });
}

export async function disableRssFeed(db: DrizzleD1Database, url: string) {
  await db
    .update(rssFeed)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(rssFeed.url, url), eq(rssFeed.isActive, true)));
}

/**
 * Updates the status of an item in the database.
 */
export async function updateItemStatus(
  db: DrizzleD1Database,
  id: string,
  status: string,
  queryText?: string
) {
  const updateData: Record<string, string> = { status };
  const createData: Record<string, string> = { id, status };

  if (queryText) {
    updateData.text = queryText;
    createData.text = queryText;
  }

  try {
    await db
      .insert(item)
      .values(createData)
      .onConflictDoUpdate({ target: item.id, set: updateData });
  } catch (error) {
    console.error(`Error updating item ${id}:`, error);
    throw error;
  }
}

/**
 * Creates or updates a queued item.
 */
export async function createQueuedItem(
  db: DrizzleD1Database,
  id: string,
  text: string,
  metadata: Record<string, any>
) {
  try {
    await db
      .insert(item)
      .values({
        id,
        status: 'queued',
        text,
        metadata: JSON.stringify(metadata),
      })
      .onConflictDoUpdate({
        target: item.id,
        set: {
          status: 'queued',
          text,
          metadata: JSON.stringify(metadata),
        },
      });
  } catch (error) {
    console.error(`Error creating queued item ${id}:`, error);
    throw error;
  }
}
