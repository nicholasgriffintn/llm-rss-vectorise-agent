import type { Env, EmbeddingResponse } from '../types';
import { embeddingsModel, gatewayId } from '../constants';

/**
 * Handles the query request by extracting the user query, generating a query vector,
 * and fetching the matching results.
 * 
 * @param request - The incoming HTTP request.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to a Response object containing the matches.
 */
export async function handleQuery(request: Request, env: Env): Promise<Response> {
  const userQuery = getUserQuery(request);

  if (!userQuery) {
    return new Response('No query provided', { status: 400 });
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env);

  return Response.json({ matches });
}

/**
 * Extracts the user query from the request URL.
 * 
 * @param request - The incoming HTTP request.
 * @returns The user query string or null if not found.
 */
function getUserQuery(request: Request): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('query');
}

/**
 * Generates a query vector for the given user query using the AI service.
 * 
 * @param userQuery - The user query string.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to an EmbeddingResponse object.
 */
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

/**
 * Fetches the matching results for the given query vector using the VECTORIZE service.
 * 
 * @param queryVector - The query vector generated from the user query.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to the matching results.
 */
async function getMatches(queryVector: EmbeddingResponse, env: Env) {
  return env.VECTORIZE.query(queryVector.data[0], {
    topK: 15,
    returnMetadata: true,
  });
}