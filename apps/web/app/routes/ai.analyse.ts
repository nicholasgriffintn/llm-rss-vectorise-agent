import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

import { loraModel, gatewayId } from '../lib/ai';
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

    if (!articleId) {
      return json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const { env } = context.cloudflare;

    let matchingItem: {
      id: string;
      text: string | null;
    }[] = [];

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
      return json({
        success: env.ENVIRONMENT === 'development',
        message: 'Article not found',
      });
    }

    const article = matchingItem[0].text;
    return new Response(
      await env.AI.run(
        loraModel,
        {
          stream: true,
          raw: true,
          prompt: `<s> [INST] Your task is provide a comprehensive analysis that identifies any potential bias, political leanings, and the tone of the content, evaluating the presence of bias and political alignment in the article provided.

Use the content provided under the heading "Article" and only that content to conduct your analysis. Do not embellish or add detail beyond the source material. The term "Article" is a placeholder for the actual content and should not be included in your output.

Always assist with care, respect, and truth. Respond with utmost utility yet securely. Avoid harmful, unethical, prejudiced, or negative content. Ensure replies promote fairness and positivity.

### Article ###:
${article}

### Instructions ###:
1. Carefully read the "Article" and note any language, phrasing, or content that may indicate bias or political alignment.
2. Do not include any conversational phrases, personal comments, or introductions. Only provide the summary and necessary sections as outlined below.
3. Provide your response in English only.
4. Your analysis must include the following sections:
   - **Introduction**: Briefly introduce the "Article" and its main topic or focus.
   - **Bias Detection**: Identify any signs of bias in the language, tone, or presentation of facts. This includes loaded language, unbalanced reporting, omission of key perspectives, or any use of subjective language that could sway the reader's opinion.
   - **Political Alignment**: Analyze the content for indicators of political alignment. This can include the portrayal of political figures, policies, or ideologies in a favorable or unfavorable light, as well as any endorsement or criticism that aligns with specific political ideologies.
   - **Examples and Evidence**: Provide specific examples from the text to support your findings. This should include direct quotes or paraphrased content that clearly illustrates the bias or political alignment identified.
   - **Conclusion**: Summarize your findings, highlighting the overall bias and political alignment, if any, and the potential impact on the reader's perception.
5. Format your analysis in clear, organized paragraphs with appropriate headings for each section. Use the Markdown format.
6. Maintain a neutral and objective tone throughout your analysis. Avoid subjective judgments or interpretations that are not directly supported by evidence from the "Article".

[/INST]

Analysis: </s>`,
        },
        {
          gateway: {
            id: gatewayId,
            skipCache: false,
            cacheTtl: 172800,
          },
        }
      ),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
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
