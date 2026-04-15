# LLM RSS Vectorise Agent - Web

This app provides a web interface for searching the vectorized RSS feed content.

## Development

Run the dev server:

```sh
npm run dev
```

The web app shares the local D1 state created by the vectorize worker. Apply the
vectorize migrations before using features that read or write `item` rows:

```sh
pnpm --filter @llm-rss-vectorise-agent/vectorize run local:migrations:apply
```

To run Wrangler:

```sh
npm run build
npm run start
```

## Typegen

Generate types for your Cloudflare bindings in `wrangler.toml`:

```sh
npm run typegen
```

You will need to rerun typegen whenever you make changes to `wrangler.toml`.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then, deploy your app to Cloudflare Pages:

```sh
npm run deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
