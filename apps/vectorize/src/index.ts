import { handleInsert } from './handlers/insert';
import { handleQueue } from './handlers/queue';
import { handleQuery } from './handlers/query';
import { handleClean } from './handlers/clean';
import type { Env } from './types';

/**
 * Handles the fetch request by routing to the appropriate handler based on the request path.
 *
 * @param request - The incoming HTTP request.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to a Response object.
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

  if (path === '/clean') {
    const queued = await handleClean(env);
    return Response.json(queued);
  }

  return handleQuery(request, env);
}

/**
 * Handles the queue batch by processing the messages.
 *
 * @param batch - The batch of messages to process.
 * @param env - The environment object containing various services.
 */
async function handleQueueBatch(batch: any, env: Env): Promise<void> {
  await handleQueue(batch, env);
}

// TODO: Need to split the work here, really, we should have one queue that triggers each URL and then another that inserts the data into the database

export default {
  fetch: handleFetch,
  queue: handleQueueBatch,
} satisfies ExportedHandler<Env>;
