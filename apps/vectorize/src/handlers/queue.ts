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
const MAX_IDS_PER_QUERY = 100;

export async function handleQueue(batch: any, env: Env) {
  const messages = parseMessages(batch);
  const db = initializeDB(env);
  const inserted = await processMessages(messages, env, db);
  logger.log(JSON.stringify(inserted));
}

function parseMessages(batch: any): Array<Message> {
  return batch.messages as unknown as Array<Message>;
}

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

async function processRSSMessage(
  id: string,
  db: DrizzleD1Database,
  env: Env
): Promise<any[]> {
  logger.log('Fetching RSS feed:', id);
  const stories = await fetchRSSFeed(id);
  const allEntries = (stories.entries || []) as Array<Record<string, any>>;

  const entryIds = [...new Set(allEntries.map((entry) => generateId(entry)))];
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

async function fetchExistingEntries(db: DrizzleD1Database, entryIds: string[]) {
  if (entryIds.length === 0) {
    return [];
  }

  try {
    const existingEntries: Array<{ id: string; status: string | null }> = [];

    for (let i = 0; i < entryIds.length; i += MAX_IDS_PER_QUERY) {
      const idBatch = entryIds.slice(i, i + MAX_IDS_PER_QUERY);
      const result = await db
        .select({
          id: item.id,
          status: item.status,
        })
        .from(item)
        .where(inArray(item.id, idBatch));

      existingEntries.push(...result);
    }

    return existingEntries;
  } catch (error) {
    logger.error('Error fetching existing entries:', error);
    throw error;
  }
}

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
      const response = await fetch(urlToUse, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; llm-rss-vectorise-agent/1.0; +https://workers.dev)',
          accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const content = await response.text();
      const newQueryText = parseFetchedContent(content, urlToUse);

      if (newQueryText && newQueryText.length > defaultText.length) {
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

function getUrlToUse(url: string): string | null {
  if (BBC_NEWS_PREFIX.test(url) || BBC_SPORT_PREFIX.test(url)) {
    return `${url}.amp`;
  }

  return url;
}

function parseFetchedContent(content: string, url: string): string {
  const $ = cheerio.load(content);
  const headline = $('h1').first().text().trim();

  if (url.startsWith(GUARDIAN_PREFIX)) {
    return parseGuardianContent($, headline);
  }

  if (BBC_NEWS_PREFIX.test(url) || BBC_SPORT_PREFIX.test(url)) {
    return parseBBCContent($, headline);
  }

  return parseGenericArticleContent($, headline);
}

function parseGuardianContent($: cheerio.CheerioAPI, headline: string): string {
  const textBlocks = [
    ...collectParagraphs($, 'main p'),
    ...collectParagraphs($, '[data-gu-name="body"] p'),
  ];

  return normaliseArticleText([headline, ...textBlocks]);
}

function parseBBCContent($: cheerio.CheerioAPI, headline: string): string {
  const textBlocks = collectParagraphs($, 'main[role="main"] p');
  return normaliseArticleText([headline, ...textBlocks]);
}

function parseGenericArticleContent(
  $: cheerio.CheerioAPI,
  headline: string
): string {
  const selectors = ['article p', 'main article p', 'main p'];

  let textBlocks: string[] = [];
  for (const selector of selectors) {
    const blocks = collectParagraphs($, selector);
    if (blocks.length >= 3) {
      textBlocks = blocks;
      break;
    }
  }

  if (!textBlocks.length) {
    textBlocks = collectParagraphs($, 'p');
  }

  return normaliseArticleText([headline, ...textBlocks]);
}

function collectParagraphs($: cheerio.CheerioAPI, selector: string): string[] {
  return $(selector)
    .not('figure p')
    .not('section p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
}

function normaliseArticleText(blocks: string[]): string {
  const seen = new Set<string>();

  return blocks
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => {
      if (!block || seen.has(block)) {
        return false;
      }
      seen.add(block);
      return true;
    })
    .join('\n\n');
}
