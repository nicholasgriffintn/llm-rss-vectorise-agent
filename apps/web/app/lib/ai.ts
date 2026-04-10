import matchesFixture from '../../test/fixtures/matches.json';

export const embeddingsModel = '@cf/baai/bge-base-en-v1.5';
export const loraModel = '@hf/mistral/mistral-7b-instruct-v0.2';
// TODO: The adapter doesn't seem to work, this is a place for more investigation, see what can be done here.
export const loraAdapter = 'cf-public-cnn-summarization';

export const gatewayId = 'llm-rss-vectorise-agent';
const DEFAULT_TOP_K = 15;
const MAX_TOP_K = 50;

export type QueryOptions = {
  topK?: number;
  sourceHost?: string | null;
};

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
export async function handleQuery(
  userQuery: string,
  env: Env,
  options: QueryOptions = {}
) {
  if (!userQuery) {
    console.error('No query provided');
    return { count: 0, matches: [] };
  }

  if (
    env.ENVIRONMENT === 'development' ||
    typeof process !== 'undefined' &&
    process?.env?.ENVIRONMENT === 'development'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return matchesFixture;
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env, options);

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
export async function getMatches(
  queryVector: EmbeddingResponse,
  env: Env,
  options: QueryOptions = {}
) {
  if (!env.VECTORIZE) {
    console.error('VECTORIZE service not available');
    return [];
  }

  const topK = Number.isFinite(options.topK)
    ? Math.max(1, Math.min(MAX_TOP_K, Math.floor(options.topK as number)))
    : DEFAULT_TOP_K;

  const response = await env.VECTORIZE.query(queryVector.data[0], {
    topK,
    returnMetadata: true,
  });

  if (!options.sourceHost) {
    return response;
  }

  const normalisedHost = options.sourceHost.trim().toLowerCase();
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
