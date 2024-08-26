import type { Env } from '../types';
import { embeddingsModel, gatewayId } from '../constants';

/**
 * Generates vectors using the AI service.
 *
 * @param env - The environment object containing various services.
 * @param id - The ID of the item.
 * @param text - The text to generate vectors from.
 * @param metadata - The metadata associated with the item.
 * @returns A promise that resolves to an array of vectors.
 */
export async function generateVectors(
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
        cacheTtl: 172800,
      },
    }
  );

  return modelResp.data.map((vector) => ({
    id: `${id}`,
    values: vector,
    metadata,
  }));
}
