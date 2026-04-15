import { handleInsert } from './handlers/insert';
import { handleQueue } from './handlers/queue';
import { handleQuery } from './handlers/query';
import { handleClean } from './handlers/clean';
import { handleFeeds } from './handlers/feeds';
import type { Env } from './types';

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
