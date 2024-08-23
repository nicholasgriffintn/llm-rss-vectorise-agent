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
export async function fetchRSSFeeds(): Promise<Record<string, any>[]> {
  const stories: Record<string, any>[] = [];

  for (const rssFeed of rssFeeds) {
    const feed = await fetchFeed(rssFeed);
    const feedText = await feed.text();
    const data = parser.parse(feedText);
    const standardFeed = parseFeed(data);

    stories.push(standardFeed);
  }

  return stories;
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
