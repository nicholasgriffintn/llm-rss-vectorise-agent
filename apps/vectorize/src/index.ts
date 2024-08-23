import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import { handleInsert } from './handlers/insert';
import { handleQueue } from './handlers/queue';
import { handleQuery } from './handlers/query';
import type { Env } from './types';

export default {
  async fetch(request, env): Promise<Response> {
    let path = new URL(request.url).pathname;

    if (path.startsWith('/favicon')) {
      return new Response('', { status: 404 });
    }

    if (!env.VECTORIZE || !env.AI || !env.DB || !env.MAIN_QUEUE) {
      return new Response('Service not available', { status: 500 });
    }

    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    if (path === '/insert') {
      const queued = await handleInsert(env, prisma);
      return Response.json(queued);
    }

    return handleQuery(request, env);
  },
  async queue(batch, env): Promise<void> {
    await handleQueue(batch, env);
  },
} satisfies ExportedHandler<Env>;
