# Platform Review (April 2026)

This review evaluates the current `llm-rss-vectorise-agent` setup against the latest practical capabilities in Cloudflare's AI stack and adjacent systems.

## Executive summary

The current architecture (Workers + Queues + Vectorize + D1 + Workers AI) remains a strong baseline for a serverless RAG workflow. The highest-impact gaps are now around retrieval controls, ingestion resilience, and model/runtime configurability.

## What is already strong

- **Cloudflare-native architecture:** Uses Queues for asynchronous ingestion and Workers for low-latency query APIs.
- **Cost-efficient retrieval:** Vectorize + D1 pairing keeps embeddings and metadata separated cleanly.
- **Simple web UX:** Search and per-article AI actions are already integrated.

## Recommended upgrades mapped to platform capabilities

### 1) Retrieval quality controls (implemented in this update)

- Add **runtime retrieval controls** for:
  - `topK` tuning per query.
  - optional source/domain filtering (`sourceHost`) to improve precision for newsroom-specific queries.
- Rationale: modern vector pipelines benefit from narrower retrieval controls before generation.

### 2) D1 query safety under scale (implemented in this update)

- Batch large `IN (...)` lookups to prevent SQL variable limits during dedupe checks.
- Rationale: ingestion spikes can exceed SQLite parameter limits, which then causes dropped/failed queue work.

### 3) Content extraction reliability (partially addressed; still recommended)

- Keep current source-specific parsing, but add resilient multi-selector extraction and better non-BBC/Guardian fallback parsing.
- Rationale: AMP and publisher markup drift can silently degrade embedding quality.

### 4) Next-phase Cloudflare capabilities to consider (not yet implemented)

- **AI Gateway observability hardening:** add per-route tags and model/provider-level analytics budgets.
- **Hybrid retrieval pattern:** pair vector retrieval with metadata/date/source constraints plus optional lexical fallback.
- **Workflow orchestration:** evaluate Cloudflare Workflows for replayable ingestion pipelines with better step-level failure tracking.
- **AutoRAG exploration:** for faster managed RAG experimentation where custom indexing control is less critical.

### 5) Adjacent systems comparison

- **OpenSearch / pgvector / Pinecone / Weaviate** can offer stronger out-of-box hybrid search and reranking ecosystems.
- Current Cloudflare setup remains attractive if your priority is global edge execution and minimal operational overhead.

## Operational metrics to track next

- Retrieval precision@k by source and topic.
- Queue retry + dead-letter rates.
- Ingestion freshness lag (feed publish time to indexed time).
- AI token + latency budgets per user-facing endpoint.

## Change log for this update

- Added query-time retrieval controls (`topK`, `sourceHost`) in both API and web query paths.
- Added chunked dedupe lookup batching for D1 to avoid SQL variable overflows.

