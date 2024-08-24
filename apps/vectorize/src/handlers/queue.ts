import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import puppeteer from '@cloudflare/puppeteer';

import type { Env, Message } from '../types';
import { logger } from '../lib/logger';
import { fetchRSSFeed } from '../lib/rss';
import {
  generateId,
  parseContent,
  extractMetadata,
  updateItemStatus,
  generateVectors,
} from '../lib/queue';

/**
 * Handles the processing of a batch of messages from the queue.
 *
 * @param batch - The batch of messages to process.
 * @param env - The environment object containing various services.
 */
export async function handleQueue(batch, env: Env) {
  const messages = parseMessages(batch);

  const prisma = initializePrisma(env);
  const inserted = await processMessages(messages, env, prisma);

  logger.log(JSON.stringify(inserted));
}

/**
 * Parses the messages from the batch.
 *
 * @param batch - The batch of messages.
 * @returns An array of parsed messages.
 */
function parseMessages(batch): Array<Message> {
  return batch.messages as unknown as Array<Message>;
}

/**
 * Initializes the Prisma client with the provided environment.
 *
 * @param env - The environment object containing various services.
 * @returns The initialized Prisma client.
 */
function initializePrisma(env: Env): PrismaClient {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

/**
 * Processes each message, updating the item status and generating vectors for each entry, or fetching and queuing RSS feeds.
 *
 * @param messages - The array of messages to process.
 * @param env - The environment object containing various services.
 * @param prisma - The Prisma client for database operations.
 * @returns A promise that resolves to an array of inserted items.
 */
async function processMessages(
  messages: Array<Message>,
  env: Env,
  prisma: PrismaClient
): Promise<any[]> {
  logger.log(`Processing ${messages.length} messages`);
  const inserted: any[] = [];

  for (const message of messages) {
    const { type, id, data } = message.body;

    if (type === 'rss') {
      const rssInserted = await processRSSMessage(id, prisma, env);
      inserted.push(...rssInserted);
    }

    if (type === 'entry') {
      const entryInserted = await processEntryMessage(id, data, prisma, env);
      if (entryInserted) {
        inserted.push(entryInserted);
      }
    }
  }

  return inserted;
}

/**
 * Processes an RSS message, fetching and queuing RSS feed entries.
 *
 * @param id - The ID of the RSS feed.
 * @param prisma - The Prisma client for database operations.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to an array of inserted items.
 */
async function processRSSMessage(
  id: string,
  prisma: PrismaClient,
  env: Env
): Promise<any[]> {
  logger.log('Fetching RSS feed:', id);
  const stories = await fetchRSSFeed(id);
  const allEntries = stories.entries || [];

  const inserted: any[] = [];

  for (const entry of allEntries) {
    const entryId = generateId(entry);
    const existing = await prisma.item.findUnique({ where: { id: entryId } });

    if (existing?.status === 'processed' || existing?.status === 'queued') {
      logger.log(
        existing.status === 'processed' ? 'Already inserted' : 'Already queued',
        entry.title
      );
      continue;
    }

    const parsedString = parseContent(entry);
    const metadata = extractMetadata(entry);

    await env.MAIN_QUEUE.send({
      type: 'entry',
      id: entryId,
      data: { text: parsedString, metadata },
    });
    await prisma.item.upsert({
      where: { id: entryId },
      update: { status: 'queued' },
      create: { id: entryId, status: 'queued' },
    });

    inserted.push({ id: entryId, status: 'queued' });
  }

  return inserted;
}

/**
 * Processes an entry message, generating vectors and updating the item status.
 *
 * @param id - The ID of the entry.
 * @param data - The data of the entry.
 * @param prisma - The Prisma client for database operations.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to the inserted item.
 */
async function processEntryMessage(
  id: string,
  data: { text: string; metadata: Record<string, any> },
  prisma: PrismaClient,
  env: Env
): Promise<any> {
  const { text: parsedString, metadata } = data;

  logger.log('Processing entry:', id);
  if (!parsedString) {
    logger.log('No text for', id);
    return null;
  }

  let queryText = parsedString;
  // TODO: Make this work, getting error: "Protocol error (Runtime.callFunctionOn): Argument should belong to the same JavaScript world as target object"
  /* if (metadata.url && env.BROWSER) {
    const url = new URL(metadata.url).toString();
    logger.log('Fetching', url);
    // @ts-expect-error - Cloudflare's Puppeteer types are incomplete
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.goto(url);

    const pTags = await page.$$('p');
    const text = await Promise.all(
      pTags.map((p) => page.evaluate((el) => el.textContent, p))
    );
    queryText = text.join(' ');

    await browser.close();
  } */

  await updateItemStatus(prisma, id, 'processing');

  const vectors = await generateVectors(env, id, queryText, metadata);
  const insertedItem = await env.VECTORIZE.upsert(vectors);

  await updateItemStatus(prisma, id, 'processed');
  return insertedItem;
}