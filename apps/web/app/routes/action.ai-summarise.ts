import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { json } from '@remix-run/cloudflare';

import { loraModel, gatewayId } from '../lib/ai';

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
