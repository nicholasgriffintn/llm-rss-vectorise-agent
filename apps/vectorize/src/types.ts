export interface Env {
  VECTORIZE: Vectorize;
  AI: Ai;
  DB: D1Database;
  MAIN_QUEUE: Queue;
  BROWSER: Fetcher;
}

export interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

export type Message = {
  attempts: number;
  body: {
    type: string;
    id: string;
    data: {
      text: string;
      metadata: Record<string, any>;
    };
  };
};