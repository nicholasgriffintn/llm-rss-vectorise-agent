import type { Env } from '../types';
import { logger } from '../lib/logger';
import { getActiveRssFeeds, initializeDB } from '../lib/db';

/**
 * Handles the insertion of RSS feed entries into the database.
 *
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to an array of queued rss feeds.
 */
export async function handleInsert(env: Env): Promise<string[]> {
  const db = initializeDB(env);
  const rssFeeds = await getActiveRssFeeds(db);

  for (const rssFeed of rssFeeds) {
    await env.MAIN_QUEUE.send({
      type: 'rss',
      id: rssFeed,
    });

    logger.log('Queued RSS feed:', rssFeed);
  }

  return rssFeeds;
}
