import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';

import { loraModel, loraAdapter, gatewayId } from '../lib/ai';

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

    // TODO: This needs to take an ID, fetch the article from the database, and analyze it
    const { env } = context.cloudflare;

    const article = 'This is a test article';
    // TODO: Update this run to use the prompt
    const answer = await env.AI.run(
      loraModel,
      {
        stream: true,
        raw: true,
        messages: [
          {
            role: 'user',
            content: `Summarize the following: ${article}`,
          },
        ],
        lora: loraAdapter,
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
