import matchesFixture from '../../test/fixtures/matches.json';

export const embeddingsModel = '@cf/baai/bge-base-en-v1.5';

export const gatewayId = 'llm-rss-vectorise-agent';

export interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

/**
 * Handles the query request by extracting the user query, generating a query vector,
 * and fetching the matching results.
 *
 * @param request - The incoming HTTP request.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to a Response object containing the matches.
 */
export async function handleQuery(userQuery: string, env: Env) {
  if (!userQuery) {
    console.error('No query provided');
    return { count: 0, matches: [] };
  }

  if (process?.env.ENVIRONMENT === 'development') {
    return matchesFixture;
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env);

  return matches;
}

/**
 * Generates a query vector for the given user query using the AI service.
 *
 * @param userQuery - The user query string.
 * @param env - The environment object containing various services.
 * @returns A promise that resolves to an EmbeddingResponse object.
 */
export async function getQueryVector(
  userQuery: string,
  env: Env
): Promise<EmbeddingResponse> {
  if (!env.AI) {
    throw new Error('AI service not available');
  }

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
export async function getMatches(queryVector: EmbeddingResponse, env: Env) {
  if (!env.VECTORIZE) {
    console.error('VECTORIZE service not available');
    return [];
  }

  return env.VECTORIZE.query(queryVector.data[0], {
    topK: 15,
    returnMetadata: true,
  });
}
