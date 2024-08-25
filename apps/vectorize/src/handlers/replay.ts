import type { Env } from '../types';
import { initializePrisma } from '../lib/db';

/**
 * Handles replaying any queued RSS feeds.
 *
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to success or failure messages.
 */

export async function handleReplay(env: Env): Promise<string[]> {
  const prisma = initializePrisma(env);

  const queued = await prisma.item.findMany({
    where: {
      status: 'queued',
    },
  });

  if (queued.length === 0) {
    return ['No queued items to replay'];
  }

  const response: string[] = [];

  for (const item of queued) {
    await env.MAIN_QUEUE.send({
      type: 'entry',
      id: item.id,
      data: item,
    });

    response.push(item.id);
  }

  return Promise.resolve(response);
}
