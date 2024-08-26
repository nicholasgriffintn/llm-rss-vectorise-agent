import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import type { Env } from '../types';
import { item } from '../drizzle/schema';

/**
 * Initializes the client with the provided environment.
 *
 * @param env - The environment object containing various services.
 * @returns The initialized client.
 */
export function initializeDB(env: Env) {
  return drizzle(env.DB);
}

/**
 * Updates the status of an item in the database.
 *
 * @param db - The client for database operations.
 * @param id - The ID of the item to update.
 * @param status - The new status of the item.
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
 * Updates the status of an item in the database.
 *
 * @param db - The client for database operations.
 * @param id - The ID of the item to update.
 * @param status - The new status of the item.
 * @param text - The text to update.
 * @param metadata - The metadata to update.
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
