import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { runTextModel } from '../lib/ai';
import { item } from '../drizzle/schema';
import articleFixture from '../../test/fixtures/article.json';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const userAgent = request.headers.get('User-Agent') || '';

    const isThisUserABot = isbot(userAgent);
    if (isThisUserABot || !userAgent) {
      return null;
    }

    const url = new URL(request.url);
    const articleId = url.searchParams.get('id');
    const question = url.searchParams.get('q');

    if (!articleId || !question) {
      return json({ success: false, message: 'Missing required fields' });
    }

    const { env } = context.cloudflare;

    let matchingItem: { id: string; text: string | null }[] = [];

    if (env.ENVIRONMENT === 'development') {
      matchingItem = [articleFixture];
    } else {
      const db = drizzle(env.DB);
      const itemResponse = await db
        .select()
        .from(item)
        .where(eq(item.id, articleId as string));
      if (itemResponse?.length) {
        matchingItem = itemResponse;
      }
    }

    if (!matchingItem?.length || !matchingItem[0].text) {
      return json({ success: false, message: 'Article not found' });
    }

    const article = matchingItem[0].text;

    const prompt = `<s> [INST] Answer the question using only the provided article content. If the answer is not in the article, say that explicitly.

### Article ###:
${article}

### Question ###:
${question}

[/INST]

Answer: </s>`;

    const response = await runTextModel(env, prompt);

    return new Response(response, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error(error);

    return json(
      {
        success: false,
        message: 'An error occurred',
        data: error,
      },
      { status: 500 }
    );
  }
}
