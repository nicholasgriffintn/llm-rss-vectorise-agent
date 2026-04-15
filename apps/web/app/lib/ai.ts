import { isDevelopmentEnvironment, shouldUseFixtures } from './env';
import matchesFixture from '../../test/fixtures/matches.json';

export const embeddingsModel = '@cf/baai/bge-base-en-v1.5';
export const loraModel = '@hf/mistral/mistral-7b-instruct-v0.2';
export const defaultLoraAdapter = 'cf-public-cnn-summarization';

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

export async function runTextModel(
  env: any,
  prompt: string,
  stream = true,
  skipCache?: boolean
) {
  const adapter =
    env?.LORA_ADAPTER && typeof env.LORA_ADAPTER === 'string'
      ? env.LORA_ADAPTER
      : defaultLoraAdapter;

  const model =
    env?.LORA_MODEL && typeof env.LORA_MODEL === 'string'
      ? env.LORA_MODEL
      : loraModel;

  const options: Record<string, any> = {
    gateway: {
      id: gatewayId,
      skipCache: skipCache ?? isDevelopmentEnvironment(env),
      cacheTtl: 172800,
    },
  };

  if (adapter) {
    options.extraHeaders = {
      'cf-ai-adapter': adapter,
    };
  }

  return env.AI.run(
    model,
    {
      stream,
      raw: true,
      prompt,
    },
    options
  );
}

export function responseHasPotentialHallucination(
  responseText: string,
  article: string
): boolean {
  const quoteMatches = responseText.match(/"([^"]{8,240})"/g) ?? [];

  if (!quoteMatches.length) {
    return false;
  }

  const normalisedArticle = article.toLowerCase().replace(/\s+/g, ' ');

  return quoteMatches.some((match) => {
    const cleanQuote = match.replace(/"/g, '').toLowerCase().replace(/\s+/g, ' ');
    return cleanQuote.length > 12 && !normalisedArticle.includes(cleanQuote);
  });
}

export async function handleQuery(
  userQuery: string,
  env: Env,
  options: QueryOptions = {}
) {
  if (!userQuery) {
    console.error('No query provided');
    return { count: 0, matches: [] };
  }

  if (shouldUseFixtures(env)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return matchesFixture;
  }

  const queryVector = await getQueryVector(userQuery, env);
  const matches = await getMatches(queryVector, env, options);

  return matches;
}

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
