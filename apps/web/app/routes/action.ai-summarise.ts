import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { loraModel, gatewayId } from '../lib/ai';
import { item } from '../drizzle/schema';
import articleFixture from '../../test/fixtures/article.json';

export async function action({ request, context }: LoaderFunctionArgs) {
  try {
    const userAgent = request.headers.get('User-Agent') || '';

    const isThisUserABot = isbot(userAgent);
    if (isThisUserABot || !userAgent) {
      return null;
    }

    const body = await request.formData();
    const articleId = body.get('id');

    if (!articleId) {
      return json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const { env } = context.cloudflare;

    let matchingItem: {
      id: string;
      text: string | null
    }[]= [];

    if (env.ENVIRONMENT === 'development') {
      matchingItem = [articleFixture];
    } else {
      const db = drizzle(env.DB);
      const itemResponse = await db.select().from(item).where(eq(item.id, articleId as string))
      if (itemResponse?.length) {
        matchingItem = itemResponse;
      }
    }

    if (!matchingItem?.length || !matchingItem[0].text) {
      return json({
        success: false,
        message: 'Article not found',
      });
    }

    const article = matchingItem[0].text;
    const answer = await env.AI.run(
      loraModel,
      {
        stream: true,
        raw: true,
        prompt: `<s> [INST] You have been given an article to summarize as a professional researcher. Your task is to provide a concise overview.

Use the content provided under the heading "Article" and only that content to conduct your analysis. Do not embellish or add detail beyond the source material. The term "Article" is a placeholder for the actual content and should not be included in your output.

When encountering a "REPLACED_IMAGE" tag, disregard the tag but consider the text below it as a description of the removed image.

Always assist with care, respect, and truth. Ensure replies are useful, secure, and promote fairness and positivity, avoiding harmful, unethical, prejudiced, or negative content.

### Article ###:
${article}

### Instructions ###:
1. Read the "Article" carefully, focusing on the main topics and subjects.
2. Your summary must be between 300-400 words long (excluding keywords). This range is for internal use and should not be mentioned in the output.
2a. Ensure all points are complete within this limit, even if fewer points are included or slight extensions are made. Do not cut points short.
3. Your report must include the following sections:
   - **Introduction**: Briefly introduce the "Article" in no more than 30 words.
   - **Key Findings**: Summarize 3-5 key findings and insights concisely, using approximately 220 words. Prioritize the most impactful points.
   - **Quotes**: Include at least one brief illustrative quote that significantly enhances a key finding. Paraphrase where possible to maintain brevity.
   - **Context and Inferences**: Provide any relevant context or inferences in about 30 words, if space allows.
   - **Keywords**: List relevant subject keywords for content tagging, focusing on core topics and themes.

4. Format your summary in clear paragraphs with headings for each section. Use Markdown format. Bullet points may be used for clarity where appropriate.
5. Regularly monitor the word count to ensure the final summary adheres to the word limit, without including the count in the output.

[/INST]

Summary: </s>`,
      },
      {
        gateway: {
          id: gatewayId,
          skipCache: env.ENVIRONMENT === 'development',
          cacheTtl: 172800,
        },
      }
    );

    // TODO: Get this to stream, not working yet
    return new Response(answer, {
      headers: {
        'Content-Type': 'text/event-stream',
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
