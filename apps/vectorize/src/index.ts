import { XMLParser } from 'fast-xml-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

const options = {
  ignoreAttributes: false,
};
const parser = new XMLParser(options);

export interface Env {
  VECTORIZE: Vectorize;
  AI: Ai;
  DB: D1Database;
}
interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    let path = new URL(request.url).pathname;
    if (path.startsWith('/favicon')) {
      return new Response('', { status: 404 });
    }

    if (!env.VECTORIZE) {
      return new Response('Vectorize not available', { status: 500 });
    }

    if (!env.AI) {
      return new Response('AI not available', { status: 500 });
    }

    if (!env.DB) {
      return new Response('DB not available', { status: 500 });
    }

    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    const rssFeeds = [
      'https://www.wired.com/feed/rss',
      'https://www.theverge.com/rss/index.xml',
      'http://feeds.bbci.co.uk/news/rss.xml',
    ];

    const inserted: VectorizeAsyncMutation[] = [];

    if (path === '/insert') {
      const stories: Record<any, any>[] = [];
      // Fetch RSS feeds and extract stories
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

      const allEntries = stories.flatMap((feed) => feed.entries);

      const limitedEntries = allEntries.slice(0, 10);

      for (let entry of limitedEntries) {
        let parsedString;
        let id = entry.guid?.['#text'] || entry.id || entry.link;
        if (id.length > 64) {
          id = id.slice(0, 64);
        }

        // Check the DB to see if we've already inserted this item
        let existing = await prisma.item.findUnique({
          where: {
            id: id,
          },
        });

        if (existing?.status === 'processed') {
          console.log('Already inserted', entry.title);
          continue;
        }

        if (entry.content) {
          // We can just embed the content directly
          console.log('Inserting', entry.title);
          if (typeof entry.content === 'string') {
            parsedString = entry.content;
          } else if (entry.content?.['#text']) {
            parsedString = entry.content['#text']
              .replace(/\\u003C/g, '<')
              .replace(/\\u003E/g, '>')
              .replace(/\\u0022/g, '"')
              .replace(/\\n/g, '');
          }
        } else if (entry.description) {
          // TODO: Can we do something better? Maybe extract the text from the HTML?
          // TODO: Is it possible to go through each vector later and update these ones?
          parsedString = entry.description;
        }

        const metadata = {
          url: entry?.link?.['@_href'],
          title: entry.title,
          description: entry.description,
          published: entry.published,
          updated: entry.updated,
          author: entry.author?.name,
        };

        const newItem = await prisma.item.upsert({
          where: {
            id: id,
          },
          update: {
            status: 'processing',
          },
          create: {
            id: id,
            status: 'processing',
          },
        });

        if (parsedString) {
          let modelResp = await env.AI.run(
            '@cf/baai/bge-base-en-v1.5',
            {
              text: [parsedString],
            },
            {
              gateway: {
                id: 'llm-rss-vectorise-agent',
                skipCache: false,
                cacheTtl: 3360,
              },
            }
          );

          let vectors: VectorizeVector[] = [];
          modelResp.data.forEach((vector) => {
            vectors.push({
              id: `${id}`,
              values: vector,
              metadata,
            });
          });

          let insertedItem = await env.VECTORIZE.upsert(vectors);

          await prisma.item.update({
            where: {
              id: id,
            },
            data: {
              status: 'processed',
            },
          });

          inserted.push(insertedItem);
        }
      }

      return Response.json(inserted);
    }

    const { searchParams } = new URL(request.url);
    let userQuery = searchParams.get('query');

    if (!userQuery) {
      return new Response('No query provided', { status: 400 });
    }

    const queryVector: EmbeddingResponse = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      {
        text: [userQuery],
      },
      {
        gateway: {
          id: 'llm-rss-vectorise-agent',
          skipCache: false,
          cacheTtl: 3360,
        },
      }
    );

    let matches = await env.VECTORIZE.query(queryVector.data[0], {
      topK: 15,
      returnMetadata: 'all',
    });
    return Response.json({
      matches: matches,
    });
  },
} satisfies ExportedHandler<Env>;
