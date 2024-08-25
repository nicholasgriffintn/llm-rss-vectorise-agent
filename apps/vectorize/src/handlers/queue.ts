import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

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

const BBC_NEWS_PREFIX = 'https://www.bbc.co.uk/news/articles/';
const BBC_SPORT_PREFIX = 'https://www.bbc.co.uk/sport/articles/';
const GUARDIAN_PREFIX = 'https://www.theguardian.com/';

/**
 * Handles the processing of a batch of messages from the queue.
 *
 * @param batch - The batch of messages to process.
 * @param env - The environment object containing various services.
 */
export async function handleQueue(batch: any, env: Env) {
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
function parseMessages(batch: any): Array<Message> {
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
    } else if (type === 'entry') {
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

  const entryIds = allEntries.map((entry) => generateId(entry));
  const existingEntries = await fetchExistingEntries(prisma, entryIds);
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
 * Fetches existing entries from the database.
 *
 * @param prisma - The Prisma client for database operations.
 * @param entryIds - The IDs of the entries to fetch.
 * @returns A promise that resolves to an array of existing entries.
 */
async function fetchExistingEntries(prisma: PrismaClient, entryIds: string[]) {
  return prisma.item.findMany({
    where: {
      id: { in: entryIds },
    },
    select: {
      id: true,
      status: true,
    },
  });
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
    if (metadata.url) {
      queryText = await fetchAndParseContent(metadata.url, queryText);
    }
  } catch (e) {
    logger.error('Error fetching content:', e);
  }

  await updateItemStatus(prisma, id, 'processing', queryText);

  const vectors = await generateVectors(env, id, queryText, metadata);
  const insertedItem = await env.VECTORIZE.upsert(vectors);

  await updateItemStatus(prisma, id, 'processed');
  return insertedItem;
}

/**
 * Fetches and parses content from a URL.
 *
 * @param url - The URL to fetch content from.
 * @param defaultText - The default text to use if fetching fails.
 * @returns A promise that resolves to the fetched and parsed content.
 */
async function fetchAndParseContent(
  url: string,
  defaultText: string
): Promise<string> {
  let queryText = defaultText;
  const urlToUse = getUrlToUse(url);

  if (urlToUse) {
    logger.log('Fetching', urlToUse);

    try {
      const response = await fetch(urlToUse);
      const content = urlToUse.endsWith('.json')
        ? await response.json()
        : await response.text();
      queryText = parseFetchedContent(content, urlToUse);
    } catch (error) {
      logger.error(`Failed to fetch the page. Error: ${error}`);
    }
  }

  return queryText;
}

/**
 * Determines the URL to use for fetching content.
 *
 * @param url - The original URL.
 * @returns The URL to use for fetching content.
 */
function getUrlToUse(url: string): string | null {
  if (url.startsWith(GUARDIAN_PREFIX)) {
    return `${url}.json`;
  } else if (
    url.startsWith(BBC_NEWS_PREFIX) ||
    url.startsWith(BBC_SPORT_PREFIX)
  ) {
    return `${url}.amp`;
  }
  return null;
}

/**
 * Parses the fetched content.
 *
 * @param content - The fetched content.
 * @param url - The URL from which the content was fetched.
 * @returns The parsed content.
 */
function parseFetchedContent(content: any, url: string): string {
  if (url.endsWith('.json')) {
    return parseGuardianContent(content);
  } else {
    return parseBBCContent(content);
  }
}

/**
 * Parses content from The Guardian.
 *
 * @param json - The JSON content.
 * @returns The parsed content.
 */
function parseGuardianContent(json: any): string {
  let headline = json.webTitle || '';
  let textBlocks: string[] = [];

  try {
    const htmlContent = json.html;
    const $ = cheerio.load(htmlContent);
    textBlocks = $('p')
      .map((i, el) => $(el).text() || '')
      .get();
  } catch (e) {
    logger.error('Text elements not found');
  }

  return [headline, ...textBlocks].join('\n');
}

/**
 * Parses content from BBC.
 *
 * @param html - The HTML content.
 * @returns The parsed content.
 */
function parseBBCContent(html: string): string {
  const $ = cheerio.load(html);
  let headline = $('h1').text() || '';
  let textBlocks: string[] = [];

  try {
    textBlocks = $('main[role="main"] p')
      .map((i, el) => $(el).text() || '')
      .get();
  } catch (e) {
    logger.error('Text elements not found');
  }

  return [headline, ...textBlocks].join('\n');
}