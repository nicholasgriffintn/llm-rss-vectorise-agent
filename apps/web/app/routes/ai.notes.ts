import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { item } from '../drizzle/schema';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');

  if (!articleId) {
    return json({ success: false, message: 'Missing id' }, { status: 400 });
  }

  const { env } = context.cloudflare;
  const db = drizzle(env.DB);

  const result = await db
    .select({ id: item.id, notes: item.notes })
    .from(item)
    .where(eq(item.id, articleId));

  return json({ success: true, notes: result[0]?.notes ?? '' });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const articleId = url.searchParams.get('id');

  if (!articleId) {
    return json({ success: false, message: 'Missing id' }, { status: 400 });
  }

  const body = await request.json<{ notes?: string }>();
  const notes = body?.notes ?? '';

  const { env } = context.cloudflare;
  const db = drizzle(env.DB);

  await db.update(item).set({ notes }).where(eq(item.id, articleId));

  return json({ success: true, notes });
}
