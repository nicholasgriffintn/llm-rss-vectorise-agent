# LLM RSS Vectorise Agent

This is a project that uses Cloudflare AI with Vectorize to make RSS feeds searchable, alongside various other models through Cloudflare's API to summarise, analyse and chat with articles.

https://github.com/user-attachments/assets/da376e10-d28b-482d-a1e5-4ae9b5965367

## Apps

### Vectorise

The [Vectorise](/apps/vectorize/README.md) app is a CloudFlare Workers app that has three triggers:

1. `insert` - This is triggered by calling the API URL with the endpoint `/insert`, it retrieves the list of RSS feeds and then queues them for processing.
2. `query` - This is triggered by calling the API URL with the endpoint `/query` and a query string parameter `query`, it will pass the contents of the query to the Cloudflare AI model and return matching results.
3. `queue` - This is triggered by Cloudflare Queues, which will send messages from the insert trigger either to process the RSS feed, or to process entries from the feed, for each entry, it will insert them into the Vectorize database as well as a Cloudflare D1 database.

#### TODO

- [ ] Currently, we are only getting extended text for BBC News and Sport articles and The Guardian is currently failing on request, this should be fixed for the Guardian and expanded for other sources, some other logic may be required here for these sources.
- [ ] The RSS feeds are hard coded, it would be interesting to see if we can allow the user to add new ones and source these from the database.
- [ ] Since moving to Drizzle, we've been getting some "Too Many SQL Variables" errors, this needs to be investigated.

### Web

This is the web interface for the Vectorise app, it allows you to search the database and view the results.

#### TODO

- [ ] For the Summarise and Analyse views, the information doesn't show until the API has returned the full response, even though it implements EventSource, we need to look at how to stream the response instead with Remix.
- [ ] Some attempt was made to use lora adapters, however, this never seemed to work, some investigation needs to be done here, it would also be interesting to see if we can use custom adapters.
- [ ] For some reason, the AI is adding gibberish to the start of the response.
- [ ] A new feature to chat about the article with AI would be cool.
- [ ] Look into adding the ability for users to submit sites to be indexed.
- [ ] Add a way for users to add additional notes about articles.