export interface Env {
  VECTORIZE: Vectorize;
  AI: Ai;
  DB: D1Database;
  MAIN_QUEUE: Queue;
}

export interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}
