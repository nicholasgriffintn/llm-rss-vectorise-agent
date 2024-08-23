import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

import type { Env } from '../types';
import { embeddingsModel, gatewayId } from '../constants';
import { logger } from '../lib/logger';

export async function handleQueue(batch, env: Env) {
  const messages = parseMessages(batch);
  logger.log(`consuming from our queue: ${JSON.stringify(messages)}`);

  const prisma = initializePrisma(env);
  const inserted = await processMessages(messages, env, prisma);

  logger.log(JSON.stringify(inserted));
}

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

function initializePrisma(env: Env): PrismaClient {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

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
