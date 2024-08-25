import type { Env } from '../types';
import { initializePrisma } from '../lib/db';

/**
 * Handles cleaning up queued items.
 *
 * @param env - The environment object containing various services.
 * @returns A message indicating the status.
 */

export async function handleClean(env: Env): Promise<{
  message: string;
}> {
  const prisma = initializePrisma(env);

  const cleaned = await prisma.item.deleteMany({
    where: { status: 'queued' },
  });

  return Promise.resolve({
    message: `Cleaned ${cleaned.count} items`,
  });
}
