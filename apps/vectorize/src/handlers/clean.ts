import { eq } from 'drizzle-orm';

import type { Env } from '../types';
import { initializeDB } from '../lib/db';
import { item } from '../drizzle/schema';

/**
 * Handles cleaning up queued items.
 *
 * @param env - The environment object containing various services.
 * @returns A message indicating the status.
 */

export async function handleClean(env: Env): Promise<{
  message: string;
  data: { deletedId: string }[];
}> {
  const db = initializeDB(env);

  const cleaned = await db
    .delete(item)
    .where(eq(item.status, 'queued'))
    .returning({ deletedId: item.id });

  return Promise.resolve({
    message: 'Cleaned up queued items',
    data: cleaned,
  });
}
