import type { PrismaClient } from '@prisma/client';
import { fetchRSSFeeds } from '../lib/rss';
import type { Env } from '../types';
import { logger } from '../lib/logger';

/**
 * Handles the insertion of RSS feed entries into the database.
 * 
 * @param env - The environment object containing various services.
 * @param prisma - The Prisma client for database operations.
 * @returns A promise that resolves to an array of queued entry IDs.
 */
export async function handleInsert(env: Env, prisma: PrismaClient): Promise<string[]> {
  const stories = await fetchRSSFeeds();
  const allEntries = stories.flatMap((feed) => feed.entries);
  const queued: string[] = [];

  for (const entry of allEntries) {
    const id = generateId(entry);
    const existing = await prisma.item.findUnique({ where: { id } });

    if (existing?.status === 'processed' || existing?.status === 'queued') {
      logger.log(
        existing.status === 'processed' ? 'Already inserted' : 'Already queued',
        entry.title
      );
      continue;
    }

    const parsedString = parseContent(entry);
    const metadata = extractMetadata(entry);

    await env.MAIN_QUEUE.send({ id, data: { text: parsedString, metadata } });
    await prisma.item.upsert({
      where: { id },
      update: { status: 'queued' },
      create: { id, status: 'queued' },
    });

    queued.push(id);
  }

  return queued;
}

/**
 * Generates a unique ID for an RSS feed entry.
 * 
 * @param entry - The RSS feed entry.
 * @returns A unique ID string.
 */
function generateId(entry: any): string {
  let id = entry.guid?.['#text'] || entry.guid || entry.id || entry.link;
  if (typeof id !== 'string') {
    id = JSON.stringify(id);
  }
  return id.length > 64 ? id.slice(0, 64) : id;
}

/**
 * Parses the content of an RSS feed entry.
 *
 * @param entry - The RSS feed entry.
 * @returns The parsed content string.
 */
function parseContent(entry: any): string {
  if (entry.content) {
    return typeof entry.content === 'string'
      ? entry.content
      : entry.content?.['#text']
          ?.replace(/\\u003C/g, '<')
          .replace(/\\u003E/g, '>')
          .replace(/\\u0022/g, '"')
          .replace(/\\n/g, '');
  }
  return entry.description || '';
}

/**
 * Extracts metadata from an RSS feed entry.
 *
 * @param entry - The RSS feed entry.
 * @returns An object containing the metadata.
 */
function extractMetadata(entry: any): Record<string, any> {
  return {
    url: entry?.link?.['@_href'] || entry.link,
    title: entry.title,
    description: entry.description,
    published: entry.published || entry.pubDate || entry.date,
    updated: entry.updated,
    author: entry.author?.name,
    image: entry.image
      ? {
          url: entry.image?.url,
          title: entry.image?.title,
          link: entry.image?.link,
        }
      : null,
    thumbnail: entry.thumbnail,
    copyright: entry.copyright,
  };
}