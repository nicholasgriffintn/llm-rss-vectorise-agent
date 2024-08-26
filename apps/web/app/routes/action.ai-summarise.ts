import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';

import { loraModel, loraAdapter, gatewayId } from '../lib/ai';
import summariseArticlePrompt from '../prompts/summarise-article.json';

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

    // TODO: This needs to take an ID, fetch the article from the database, and summarise it
    const { env } = context.cloudflare;

    const article =
      'Has the mystery of a beach \'ghost\' railway been solved? Image source, Gemma Clarke On a quiet beach lies the remains of a disused railway track. Speculation has raged online about why it is there, but could the mystery finally have been solved? Sections of the line exposed by the sea jut from the sand on Trimingham beach on the North Norfolk coast, and the wheels of a partially buried truck can be seen nearby. Earlier this month, a holidaymaker posted photos of the track on Facebook. "It\'s not everyday you find railway lines on the beach," the post read. It generated more than 1,000 likes and 170 comments as people eagerly speculated on the track\'s purpose and its past One local historian suggested the track was laid during World War Two to assist with the construction of concrete fortifications at Trimingham. Meanwhile, a Norfolk heritage group claimed it was used after the war to take coastal mines further down the beach for controlled detonation. So when and why was the track laid? Image source, North Norfolk District Cocunil According to Rob Goodliffe, a coastal transition manager at North Norfolk District Council, neither explanation is correct. "As far as I\'m aware, those train tracks were built in 1973 to support the building of the coast protection structures - the timber revetments which go along the cliffs, but also the groynes," he said. "Trimingham beach is a really remote location and there aren\'t any nearby beach accesses so they were put there to move things around like concrete, steel sheet piles and timber." Mr Goodliffe said contractors would have faced a "very, very difficult task", as photos suggested cliff falls were destroying the tracks as the coastal defences were being built. Image source, North Norfolk District Council "I believe the tracks were covered by cliff materials, big cliff failures, and workers physically couldn\'t get to the tracks to remove them," he said. "But over the years that material has washed away and has left them exposed. "There\'s a few other interesting things down there, like the axles of a truck. Again, that was from the construction work as well." Image source, Gemma Clarke Image source, North Norfolk District Council As in other parts of Norfolk, coastal erosion remains a constant threat, and sea defences continue to line the beach, located beween Cromer and Mundesley. Over the years, the abandoned railway tracks have become something of a tourist attraction. "I have been coming to Norfolk since I was little and there\'s been a pillbox on East Runton beach and at Salthouse that I\'ve been fascinated with," said Gemma Clarke, 41, from Coalville, Leicestershire. It was her Facebook post that sparked interest in the tracks earlier this month. "Over the years I\'ve been looking for more around the Norfolk coast so I looked on Google maps and found the tracks," she said. "I was very intrigued to see them and dragged my family out after 7pm to go down to look at them." Image source, North Norfolk District Council Ms Clarke said she was unsure whether the tracks should remain on the beach. "I think they should remain in one sense, but they could also be put in a museum for everyone to enjoy for future generations," she added. Image source, Gemma Clarke Mr Goodliffe said the council had no plans to take them away. "I don\'t think that would be a good use of our funds to do that. And I think they are now part of the heritage and the story of Trimingham," he said. However, he warned people visiting the railway tracks to take extra care. "It\'s worth exploring, but if people do go down there, just be very, very careful around the base of the cliffs because they do erode and bits do drop off from time to time." What stories would you like BBC News to cover from Norfolk? Follow Norfolk news on BBC Sounds, Facebook, Instagram and X.';
    const answer = await env.AI.run(
      loraModel,
      {
        stream: true,
        raw: true,
        messages: [
          ...summariseArticlePrompt,
          {
            role: 'user',
            content: `Summarize the following news: ${article}`,
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
