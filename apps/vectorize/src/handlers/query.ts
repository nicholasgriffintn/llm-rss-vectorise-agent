import type { Env, EmbeddingResponse } from '../types';
import { embeddingsModel, gatewayId } from '../constants';

const DEFAULT_TOP_K = 15;
const MAX_TOP_K = 50;

type QueryOptions = {
  query: string | null;
  sourceHost: string | null;
  topK: number;
};

/**
 * Handles the query request by extracting the user query, generating a query vector,
 * and fetching the matching results.
 * 
 * @param request - The incoming HTTP request.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to a Response object containing the matches.
 */
export async function handleQuery(request: Request, env: Env): Promise<Response> {
  const { query: userQuery, sourceHost, topK } = getQueryOptions(request);

  if (!userQuery) {
    return new Response('No query provided', { status: 400 });
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env, sourceHost, topK);

  return Response.json({ matches, topK, sourceHost });
}

/**
 * Extracts the user query from the request URL.
 * 
 * @param request - The incoming HTTP request.
 * @returns The user query string or null if not found.
 */
function getQueryOptions(request: Request): QueryOptions {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const sourceHost = searchParams.get('sourceHost');
  const topKParam = Number(searchParams.get('topK'));
  const topK = Number.isFinite(topKParam)
    ? Math.max(1, Math.min(MAX_TOP_K, Math.floor(topKParam)))
    : DEFAULT_TOP_K;

  return {
    query,
    sourceHost,
    topK,
  };
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
        cacheTtl: 172800,
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
async function getMatches(
  queryVector: EmbeddingResponse,
  env: Env,
  sourceHost: string | null,
  topK: number
) {
  const response = await env.VECTORIZE.query(queryVector.data[0], {
    topK,
    returnMetadata: true,
  });

  if (!sourceHost) {
    return response;
  }

  const normalisedHost = sourceHost.trim().toLowerCase();
  const filteredMatches = response.matches.filter((match) => {
    const metadataUrl = match.metadata?.url;

    if (typeof metadataUrl !== 'string' || !metadataUrl) {
      return false;
    }

    try {
      return new URL(metadataUrl).hostname.toLowerCase() === normalisedHost;
    } catch {
      return false;
    }
  });

  return {
    ...response,
    count: filteredMatches.length,
    matches: filteredMatches,
  };
}
