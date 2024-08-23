import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import type { Env } from '../types';
import { embeddingsModel, gatewayId } from '../constants';
import { logger } from '../lib/logger';

/**
 * Handles the processing of a batch of messages from the queue.
 * 
 * @param batch - The batch of messages to process.
 * @param env - The environment object containing various services.
 */
export async function handleQueue(batch, env: Env) {
  const messages = parseMessages(batch);
  logger.log(`consuming from our queue: ${JSON.stringify(messages)}`);

  const prisma = initializePrisma(env);
  const inserted = await processMessages(messages, env, prisma);

  logger.log(JSON.stringify(inserted));
}

/**
 * Parses the messages from the batch.
 * 
 * @param batch - The batch of messages.
 * @returns An array of parsed messages.
 */
function parseMessages(batch): Array<{
  attempts: number;
  body: {
    id: string;
    data: {
      text: string;
      metadata: Record<string, any>;
    };
  };
}> {
  return batch.messages as unknown as Array<{
    attempts: number;
    body: {
      id: string;
      data: {
        text: string;
        metadata: Record<string, any>;
      };
    };
  }>;
}

/**
 * Initializes the Prisma client with the provided environment.
 * 
 * @param env - The environment object containing various services.
 * @returns The initialized Prisma client.
 */
function initializePrisma(env: Env): PrismaClient {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

/**
 * Processes each message, updating the item status and generating vectors.
 * 
 * @param messages - The array of messages to process.
 * @param env - The environment object containing various services.
 * @param prisma - The Prisma client for database operations.
 * @returns A promise that resolves to an array of inserted items.
 */
async function processMessages(
  messages: Array<{
    attempts: number;
    body: {
      id: string;
      data: {
        text: string;
        metadata: Record<string, any>;
      };
    };
  }>,
  env: Env,
  prisma: PrismaClient
): Promise<any[]> {
  const inserted: any[] = [];

  for (const message of messages) {
    const {
      id,
      data: { text: parsedString, metadata },
    } = message.body;

    if (!parsedString) {
      logger.log('No text for', id);
      continue;
    }

    await updateItemStatus(prisma, id, 'processing');

    const vectors = await generateVectors(env, id, parsedString, metadata);
    const insertedItem = await env.VECTORIZE.upsert(vectors);

    await updateItemStatus(prisma, id, 'processed');
    inserted.push(insertedItem);
  }

  return inserted;
}

/**
 * Updates the status of an item in the database.
 * 
 * @param prisma - The Prisma client for database operations.
 * @param id - The ID of the item to update.
 * @param status - The new status of the item.
 */
async function updateItemStatus(
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

/**
 * Generates vectors using the AI service.
 * 
 * @param env - The environment object containing various services.
 * @param id - The ID of the item.
 * @param text - The text to generate vectors from.
 * @param metadata - The metadata associated with the item.
 * @returns A promise that resolves to an array of vectors.
 */
async function generateVectors(
  env: Env,
  id: string,
  text: string,
  metadata: Record<string, any>
) {
  const modelResp = await env.AI.run(
    embeddingsModel,
    { text: [text] },
    {
      gateway: {
        id: gatewayId,
        skipCache: false,
        cacheTtl: 3360,
      },
    }
  );

  return modelResp.data.map((vector) => ({
    id: `${id}`,
    values: vector,
    metadata,
  }));
}