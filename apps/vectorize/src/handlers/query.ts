import type { Env, EmbeddingResponse } from '../types';
import { embeddingsModel, gatewayId } from '../constants';

export async function handleQuery(request: Request, env: Env) {
  const userQuery = getUserQuery(request);

  if (!userQuery) {
    return new Response('No query provided', { status: 400 });
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env);

  return Response.json({ matches });
}

function getUserQuery(request: Request): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('query');
}

async function getQueryVector(
  userQuery: string,
  env: Env
): Promise<EmbeddingResponse> {
  return env.AI.run(
    embeddingsModel,
    { text: [userQuery] },
    {
      gateway: {
        id: gatewayId,
        skipCache: false,
        cacheTtl: 3360,
      },
    }
  );
}

async function getMatches(queryVector: EmbeddingResponse, env: Env) {
  return env.VECTORIZE.query(queryVector.data[0], {
    topK: 15,
    returnMetadata: 'all',
  });
}
