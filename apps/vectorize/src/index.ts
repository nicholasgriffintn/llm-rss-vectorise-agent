import { XMLParser } from 'fast-xml-parser';

const options = {
  ignoreAttributes: false,
};
const parser = new XMLParser(options);

export interface Env {
  VECTORIZE: Vectorize;
  AI: Ai;
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

      for (let entry of allEntries) {
        let parsedString;
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
          let id = entry.guid?.['#text'] || entry.id || entry.link;
          if (id.length > 64) {
            id = id.slice(0, 64);
          }
          modelResp.data.forEach((vector) => {
            vectors.push({
              id: `${id}`,
              values: vector,
              metadata: {
                url: entry?.link?.['@_href'],
                title: entry.title,
                description: entry.description,
                published: entry.published,
                updated: entry.updated,
                author: entry.author?.name,
              },
            });
          });

          if (!env.VECTORIZE) {
            return new Response('Vectorize not available', { status: 500 });
          }

          let insertedItem = await env.VECTORIZE.upsert(vectors);

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
    });
    return Response.json({
      matches: matches,
    });
  },
} satisfies ExportedHandler<Env>;
