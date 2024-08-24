import { PrismaClient } from '@prisma/client';
import type { Env } from '../types';
import { embeddingsModel, gatewayId } from '../constants';

/**
 * Generates a unique ID for an RSS feed entry.
 *
 * @param entry - The RSS feed entry.
 * @returns A unique ID string.
 */
export function generateId(entry: any): string {
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
export function parseContent(entry: any): string {
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
export function extractMetadata(entry: any): Record<string, any> {
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

/**
 * Updates the status of an item in the database.
 *
 * @param prisma - The Prisma client for database operations.
 * @param id - The ID of the item to update.
 * @param status - The new status of the item.
 */
export async function updateItemStatus(
  prisma: PrismaClient,
  id: string,
  status: string
) {
  await prisma.item.upsert({
    where: { id },
    update: { status },
    create: { id, status },
  });
}

/**
 * Generates vectors using the AI service.
 *
 * @param env - The environment object containing various services.
 * @param id - The ID of the item.
 * @param text - The text to generate vectors from.
 * @param metadata - The metadata associated with the item.
 * @returns A promise that resolves to an array of vectors.
 */
export async function generateVectors(
  env: Env,
  id: string,
  text: string,
  metadata: Record<string, any>
) {
  const modelResp = await env.AI.run(
    embeddingsModel,
    { text: [text] },
    {
      gateway: {
        id: gatewayId,
        skipCache: false,
        cacheTtl: 3360,
      },
    }
  );

  return modelResp.data.map((vector) => ({
    id: `${id}`,
    values: vector,
    metadata,
  }));
}
