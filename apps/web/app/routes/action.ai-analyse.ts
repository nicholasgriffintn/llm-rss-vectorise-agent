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
        success: env.ENVIRONMENT === 'development',
        message: 'Article not found',
      });
    }

    const article = matchingItem[0].text;
    const answer = await env.AI.run(
      loraModel,
      {
        stream: true,
        raw: true,
        prompt: `<s> [INST] You are a professional media analyst tasked with evaluating the presence of bias and political alignment in a given article. Your objective is to provide a comprehensive analysis that identifies any potential bias, political leanings, and the tone of the content.

Use the content provided under the heading "Article" and only that content to conduct your analysis. Do not embellish or add detail beyond the source material. The term "Article" is a placeholder for the actual content and should not be included in your output.

When encountering a "REPLACED_IMAGE" tag, disregard the tag but consider the text below it as a description of the removed image.

Always assist with care, respect, and truth. Respond with utmost utility yet securely. Avoid harmful, unethical, prejudiced, or negative content. Ensure replies promote fairness and positivity.

### Article ###:
${article}

### Instructions ###:
1. Carefully read the "Article" and note any language, phrasing, or content that may indicate bias or political alignment.
2. Your analysis must include the following sections:
   - **Introduction**: Briefly introduce the "Article" and its main topic or focus.
   - **Bias Detection**: Identify any signs of bias in the language, tone, or presentation of facts. This includes loaded language, unbalanced reporting, omission of key perspectives, or any use of subjective language that could sway the reader's opinion.
   - **Political Alignment**: Analyze the content for indicators of political alignment. This can include the portrayal of political figures, policies, or ideologies in a favorable or unfavorable light, as well as any endorsement or criticism that aligns with specific political ideologies.
   - **Examples and Evidence**: Provide specific examples from the text to support your findings. This should include direct quotes or paraphrased content that clearly illustrates the bias or political alignment identified.
   - **Conclusion**: Summarize your findings, highlighting the overall bias and political alignment, if any, and the potential impact on the reader's perception.

3. Format your analysis in clear, organized paragraphs with appropriate headings for each section. Use Markdown format.
4. Maintain a neutral and objective tone throughout your analysis. Avoid subjective judgments or interpretations that are not directly supported by evidence from the "Article".

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
