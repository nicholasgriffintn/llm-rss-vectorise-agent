import { addRssFeed, disableRssFeed, getActiveRssFeeds, initializeDB } from '../lib/db';
import type { Env } from '../types';

export async function handleFeeds(request: Request, env: Env): Promise<Response> {
  const db = initializeDB(env);

  if (request.method === 'GET') {
    const feeds = await getActiveRssFeeds(db);
    return Response.json({ feeds });
  }

  if (request.method === 'POST') {
    const body = await request.json<{ url?: string }>();

    if (!body?.url) {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(body.url);
      await addRssFeed(db, parsedUrl.toString());
      return Response.json({ success: true, url: parsedUrl.toString() });
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  if (request.method === 'DELETE') {
    const body = await request.json<{ url?: string }>();

    if (!body?.url) {
      return Response.json({ error: 'Missing url' }, { status: 400 });
    }

    await disableRssFeed(db, body.url);
    return Response.json({ success: true, url: body.url });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}