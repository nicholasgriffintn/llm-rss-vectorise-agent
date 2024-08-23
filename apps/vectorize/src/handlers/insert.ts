import type { PrismaClient } from '@prisma/client';
import { fetchRSSFeeds } from '../lib/rss';
import type { Env } from '../types';
import { logger } from '../lib/logger';

export async function handleInsert(env: Env, prisma: PrismaClient) {
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

function generateId(entry: any): string {
  let id = entry.guid?.['#text'] || entry.id || entry.link;
  return id.length > 64 ? id.slice(0, 64) : id;
}

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

function extractMetadata(entry: any): Record<string, any> {
  return {
    url: entry?.link?.['@_href'],
    title: entry.title,
    description: entry.description,
    published: entry.published,
    updated: entry.updated,
    author: entry.author?.name,
  };
}
