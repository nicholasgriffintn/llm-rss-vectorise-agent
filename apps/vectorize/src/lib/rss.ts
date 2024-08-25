import { XMLParser } from 'fast-xml-parser';
import { rssFeeds } from '../constants';

const options = {
  ignoreAttributes: false,
};
const parser = new XMLParser(options);

/**
 * Fetches and parses RSS feeds from the provided URLs.
 *
 * @returns A promise that resolves to an array of parsed RSS feed objects.
 */
export async function fetchRSSFeed(
  rssFeed: string
): Promise<Record<string, any>> {
  const feed = await fetchFeed(rssFeed);
  const feedText = await feed.text();
  const data = parser.parse(feedText);
  const standardFeed = parseFeed(data);

  return standardFeed;
}

/**
 * Fetches the RSS feed from the given URL.
 *
 * @param url - The URL of the RSS feed.
 * @returns A promise that resolves to the fetched response.
 */
async function fetchFeed(url: string): Promise<Response> {
  return fetch(url);
}

/**
 * Parses the raw feed data into a standard format.
 *
 * @param data - The raw feed data.
 * @returns The parsed feed object in a standard format.
 */
function parseFeed(data: any): Record<string, any> {
  const feedContents = data.feed || data.rss;

  return {
    title: feedContents?.channel?.title || feedContents?.title,
    description:
      feedContents?.channel?.description || feedContents?.description,
    link: feedContents?.channel?.link || feedContents?.link,
    copyright: feedContents?.channel?.copyright,
    lastUpdated: feedContents?.channel?.lastBuildDate || feedContents?.updated,
    entries: feedContents?.channel?.item || feedContents?.entry,
  };
}

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
  id = id.replace(/#.*$/, '');
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
    url: entry.link?.['@_href'] || entry.link,
    title: entry.title,
    description: entry.description,
    published:
      entry.published || entry.pubDate || entry.date || entry['dc:date'],
    updated: entry.updated,
    author: entry.author?.name || entry['dc:creator'],
    thumbnail: entry['media:thumbnail']
      ? {
          url: entry['media:thumbnail']?.['@_url'],
          width: entry['media:thumbnail']?.['@_width'],
          height: entry['media:thumbnail']?.['@_height'],
        }
      : null,
    media: entry['media:content']?.length
      ? entry?.['media:content'].map((content) => {
          return {
            url: content?.['@_url'],
            type: content?.['@_type'],
            width: content?.['@_width'],
            height: content?.['@_height'],
            credit: content?.['@_credit'],
          };
        })
      : null,
    categories: entry.content?.length
      ? entry.content.map((c) => {
          return {
            url: c?.['@_domain'],
            label: c?.['#text'],
          };
        })
      : [],
    copyright: entry.copyright,
  };
}
