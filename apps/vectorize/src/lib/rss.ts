import { XMLParser } from 'fast-xml-parser';

import { rssFeeds } from '../constants';

const options = {
  ignoreAttributes: false,
};
const parser = new XMLParser(options);

export async function fetchRSSFeeds() {
  const stories: Record<any, any>[] = [];
  for (let rssFeed of rssFeeds) {
    let feed = await fetch(rssFeed);
    let feedText = await feed.text();
    let data = parser.parse(feedText);

    let feedContents = data.feed || data.rss;
    let standardFeed = {
      title: feedContents?.channel?.title || feedContents?.title,
      description:
        feedContents?.channel?.description || feedContents?.description,
      link: feedContents?.channel?.link || feedContents?.link,
      copyright: feedContents?.channel?.copyright,
      lastUpdated:
        feedContents?.channel?.lastBuildDate || feedContents?.updated,
      entries: feedContents?.channel?.item || feedContents?.entry,
    };

    stories.push(standardFeed);
  }
  return stories;
}
