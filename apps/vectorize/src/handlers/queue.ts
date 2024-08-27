import * as cheerio from 'cheerio';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { inArray } from 'drizzle-orm';

import type { Env, Message } from '../types';
import { logger } from '../lib/logger';
import { fetchRSSFeed } from '../lib/rss';
import { generateId, parseContent, extractMetadata } from '../lib/rss';
import { initializeDB, updateItemStatus, createQueuedItem } from '../lib/db';
import { generateVectors } from '../lib/ai';
import { item } from '../drizzle/schema';

const BBC_NEWS_PREFIX = /^https:\/\/www\.bbc\.com\/news(\/.+)?\/articles\/.+$/;
const BBC_SPORT_PREFIX =
  /^https:\/\/www\.bbc\.com\/sport(\/.+)?\/articles\/.+$/;
const GUARDIAN_PREFIX = 'https://www.theguardian.com/';

/**
 * Handles the processing of a batch of messages from the queue.
 *
 * @param batch - The batch of messages to process.
 * @param env - The environment object containing various services.
 */
export async function handleQueue(batch: any, env: Env) {
  const messages = parseMessages(batch);
  const db = initializeDB(env);
  const inserted = await processMessages(messages, env, db);
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
 * @param db - The client for database operations.
 * @returns A promise that resolves to an array of inserted items.
 */
async function processMessages(
  messages: Array<Message>,
  env: Env,
  db: DrizzleD1Database
): Promise<any[]> {
  logger.log(`Processing ${messages.length} messages`);
  const inserted: any[] = [];

  for (const message of messages) {
    const { type, id, data } = message.body;

    if (type === 'rss') {
      const rssInserted = await processRSSMessage(id, db, env);
      inserted.push(...rssInserted);
    } else if (type === 'entry') {
      const entryInserted = await processEntryMessage(id, data, db, env);
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
 * @param db - The client for database operations.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to an array of inserted items.
 */
async function processRSSMessage(
  id: string,
  db: DrizzleD1Database,
  env: Env
): Promise<any[]> {
  logger.log('Fetching RSS feed:', id);
  const stories = await fetchRSSFeed(id);
  const allEntries = stories.entries || [];

  const entryIds = allEntries.map((entry) => generateId(entry));
  const existingEntries = await fetchExistingEntries(db, entryIds);
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
 * @param - The client for database operations.
 * @param entryIds - The IDs of the entries to fetch.
 * @returns A promise that resolves to an array of existing entries.
 */
async function fetchExistingEntries(db: DrizzleD1Database, entryIds: string[]) {
  try {
    return db
      .select({
        id: item.id,
        status: item.status,
      })
      .from(item)
      .where(inArray(item.id, entryIds));
  } catch (error) {
    logger.error('Error fetching existing entries:', error);
    throw error;
  }
}

/**
 * Processes an entry message, generating vectors and updating the item status.
 *
 * @param id - The ID of the entry.
 * @param data - The data of the entry.
 * @param db - The client for database operations.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to the inserted item.
 */
async function processEntryMessage(
  id: string,
  data: { text: string; metadata: Record<string, any> },
  db: DrizzleD1Database,
  env: Env
): Promise<any> {
  const { text: parsedString, metadata } = data;

  logger.log('Processing entry:', id);
  if (!parsedString) {
    logger.log('No text for', id);
    return null;
  }
  await createQueuedItem(db, id, parsedString, metadata);

  let queryText = parsedString;
  let hasExtendedContent = false;
  try {
    if (metadata.url) {
      const { queryText: newQueryText, completed: fetchCompleted } =
        await fetchAndParseContent(metadata.url, queryText);
      queryText = newQueryText;
      hasExtendedContent = fetchCompleted;
    }
  } catch (e) {
    logger.error('Error fetching content:', e);
  }

  await updateItemStatus(db, id, 'processing', queryText);

  const vectors = await generateVectors(env, id, queryText, {
    ...metadata,
    hasExtendedContent,
  });
  const insertedItem = await env.VECTORIZE.upsert(vectors);

  await updateItemStatus(db, id, 'processed');
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
): Promise<{
  queryText: string;
  completed: boolean;
}> {
  let queryText = defaultText;
  let completed = false;
  const urlToUse = getUrlToUse(url);

  if (urlToUse) {
    logger.log('Fetching', urlToUse);

    try {
      const response = await fetch(urlToUse);
      const content = urlToUse.endsWith('.json')
        ? await response.json()
        : await response.text();
      const newQueryText = parseFetchedContent(content, urlToUse);

      if (newQueryText) {
        queryText = newQueryText;
        completed = true;
      }
    } catch (error) {
      logger.error(`Failed to fetch the page. Error: ${error}`);
    }
  }

  return {
    queryText,
    completed,
  };
}

/**
 * Determines the URL to use for fetching content.
 *
 * @param url - The original URL.
 * @returns The URL to use for fetching content.
 */
function getUrlToUse(url: string): string | null {
  if (BBC_NEWS_PREFIX.test(url) || BBC_SPORT_PREFIX.test(url)) {
    return `${url}.amp`;
  }
  if (url.startsWith(GUARDIAN_PREFIX)) {
    return `${url}/amp`;
  }
  return url;
}

/**
 * Parses the fetched content.
 *
 * @param content - The fetched content.
 * @param url - The URL from which the content was fetched.
 * @returns The parsed content.
 */
function parseFetchedContent(content: any, url: string): string {
  if (url.startsWith(GUARDIAN_PREFIX)) {
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
function parseGuardianContent(html: any): string {
  const $ = cheerio.load(html);
  let headline = $('h1').text() || '';
  let textBlocks: string[] = [];

  try {
    textBlocks = $('#maincontent p')
      .not('figure p')
      .map((i, el) => $(el).text() || '')
      .get();
  } catch (e) {
    logger.error('Text elements not found');
  }

  return [headline, ...textBlocks].join('\n\n');
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
      .not('figure p')
      .not('section p')
      .map((i, el) => $(el).text() || '')
      .get();
  } catch (e) {
    logger.error('Text elements not found');
  }

  return [headline, ...textBlocks].join('\n\n');
}
