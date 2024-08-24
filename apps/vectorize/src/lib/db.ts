import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import type { Env } from '../types';

/**
 * Initializes the Prisma client with the provided environment.
 *
 * @param env - The environment object containing various services.
 * @returns The initialized Prisma client.
 */
export function initializePrisma(env: Env): PrismaClient {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

/**
 * Updates the status of an item in the database.
 *
 * @param prisma - The Prisma client for database operations.
 * @param id - The ID of the item to update.
 * @param status - The new status of the item.
 */
export async function updateItemStatus(
  prisma: PrismaClient,
  id: string,
  status: string
) {
  await prisma.item.upsert({
    where: { id },
    update: { status },
    create: { id, status },
  });
}
