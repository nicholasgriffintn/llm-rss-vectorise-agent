import { handleInsert } from './handlers/insert';
import { handleQueue } from './handlers/queue';
import { handleQuery } from './handlers/query';
import { handleClean } from './handlers/clean';
import type { Env } from './types';
import { addRssFeed, disableRssFeed, getActiveRssFeeds, initializeDB } from './lib/db';

async function handleFeeds(request: Request, env: Env): Promise<Response> {
  const db = initializeDB(env);

  if (request.method === 'GET') {
    const feeds = await getActiveRssFeeds(db);
    return Response.json({ feeds });
  }

  if (request.method === 'POST') {
    const body = await request.json<{ url?: string }>();

    if (!body?.url) {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(body.url);
      await addRssFeed(db, parsedUrl.toString());
      return Response.json({ success: true, url: parsedUrl.toString() });
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  if (request.method === 'DELETE') {
    const body = await request.json<{ url?: string }>();

    if (!body?.url) {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }

    await disableRssFeed(db, body.url);
    return Response.json({ success: true, url: body.url });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

/**
 * Handles the fetch request by routing to the appropriate handler based on the request path.
 */
async function handleFetch(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (path.startsWith('/favicon')) {
    return new Response('', { status: 404 });
  }

  if (!env.VECTORIZE || !env.AI || !env.DB || !env.MAIN_QUEUE) {
    return new Response('Service not available', { status: 500 });
  }

  if (path === '/insert') {
    const queued = await handleInsert(env);
    return Response.json(queued);
  }

  if (path === '/feeds') {
    return handleFeeds(request, env);
  }

  if (path === '/clean') {
    const queued = await handleClean(env);
    return Response.json(queued);
  }

  return handleQuery(request, env);
}

async function handleQueueBatch(batch: any, env: Env): Promise<void> {
  await handleQueue(batch, env);
}

export default {
  fetch: handleFetch,
  queue: handleQueueBatch,
} satisfies ExportedHandler<Env>;
