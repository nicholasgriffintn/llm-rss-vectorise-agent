import { PrismaClient } from '@prisma/client';
import puppeteer from '@cloudflare/puppeteer';

import type { Env, Message } from '../types';
import { logger } from '../lib/logger';
import { fetchRSSFeed } from '../lib/rss';
import { generateId, parseContent, extractMetadata } from '../lib/rss';
import {
  initializePrisma,
  updateItemStatus,
  createQueuedItem,
} from '../lib/db';
import { generateVectors } from '../lib/ai';
import { getRandomSession } from '../lib/browser';

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

  // Generate IDs for all entries
  const entryIds = allEntries.map((entry) => generateId(entry));

  // Fetch all existing entries from the database in one query
  const existingEntries = await prisma.item.findMany({
    where: {
      id: { in: entryIds },
    },
    select: {
      id: true,
      status: true,
    },
  });

  // Create a map of existing entries for quick lookup
  const existingEntriesMap = new Map(
    existingEntries.map((entry) => [entry.id, entry.status])
  );

  const inserted: any[] = [];

  for (const entry of allEntries) {
    const entryId = generateId(entry);
    const existingStatus = existingEntriesMap.get(entryId);

    if (existingStatus === 'processed' || existingStatus === 'queued') {
      logger.log(
        existingStatus === 'processed' ? 'Already inserted' : 'Already queued',
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
  await createQueuedItem(prisma, id, parsedString, metadata);

  let queryText = parsedString;
  try {
    if (metadata.url && env.BROWSER) {
      const url = new URL(metadata.url).toString();
      const isBBCNews =
        url.startsWith('https://www.bbc.co.uk/news/') ||
        url.startsWith('https://www.bbc.com/news/');
      const isBBCSport =
        url.startsWith('https://www.bbc.co.uk/sport/') ||
        url.startsWith('https://www.bbc.com/sport/');

      if (isBBCNews || isBBCSport) {
        logger.log('Fetching', url);
        let sessionId = await getRandomSession(env.BROWSER);
        let browser, launched;
        if (sessionId) {
          try {
            // @ts-expect-error - Cloudflare's Puppeteer types are incomplete
            browser = await puppeteer.connect(env.BROWSER, sessionId);
          } catch (e) {
            // another worker may have connected first
            logger.error(`Failed to connect to ${sessionId}. Error ${e}`);
          }
        }
        if (!browser) {
          // No open sessions, launch new session
          // @ts-expect-error - Cloudflare's Puppeteer types are incomplete
          browser = await puppeteer.launch(env.BROWSER);
          launched = true;
        }

        sessionId = browser.sessionId();

        const page = await browser.newPage();
        await page.goto(url);

        let headline = null;
        try {
          headline = await page.$eval(
            '[headline-block]',
            (el) => el.textContent || ''
          );
        } catch (e) {
          logger.error('Headline element not found');
        }

        let textBlocks: unknown[] = [];
        try {
          textBlocks = await page.$$eval('[text-block]', (els) =>
            els.map((el) => el.textContent || '')
          );
        } catch (e) {
          logger.error('Text elements not found');
        }

        queryText = [headline, ...textBlocks].join('\n');

        console.log('Query text:', queryText);

        await browser.disconnect();
      }
    }
  } catch (e) {
    logger.error('Error rendering in browser:', e);
  }

  await updateItemStatus(prisma, id, 'processing');

  const vectors = await generateVectors(env, id, queryText, metadata);
  const insertedItem = await env.VECTORIZE.upsert(vectors);

  await updateItemStatus(prisma, id, 'processed');
  return insertedItem;
}
