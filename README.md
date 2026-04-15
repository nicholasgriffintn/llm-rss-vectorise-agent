# LLM RSS Vectorise Agent

This is a project that uses Cloudflare AI with Vectorize to make RSS feeds searchable, alongside various other models through Cloudflare's API to summarise, analyse and chat with articles.

https://github.com/user-attachments/assets/a77b4a33-20f9-4601-ba46-39ba798d7c6c

## Apps

### Vectorise

The [Vectorise](/apps/vectorize/README.md) app is a CloudFlare Workers app that has the following triggers and endpoints:

1. `insert` - Triggered by calling `/insert`; retrieves active RSS feeds and queues them for processing.
2. `query` - Triggered by calling `/query?query=<your query>`; embeds the query and returns matching results.
3. `queue` - Triggered by Cloudflare Queues to process RSS feed messages and article entry messages.
4. `feeds` - Manage feed sources in D1:
   - `GET /feeds` returns active RSS feeds.
   - `POST /feeds` with `{ "url": "https://example.com/rss.xml" }` adds/enables a feed.
   - `DELETE /feeds` with `{ "url": "https://example.com/rss.xml" }` disables a feed.

### Web

This is the web interface for the Vectorise app. It allows users to search, summarise, analyse, chat about articles, and save article notes.
