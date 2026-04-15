import { fileURLToPath } from 'node:url';
import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from '@remix-run/dev';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const sharedLocalPersistPath = fileURLToPath(
  new URL('../vectorize/.wrangler/state/v3', import.meta.url)
);

export default defineConfig({
  plugins: [
    tailwindcss(),
    remixCloudflareDevProxy({
      persist: {
        path: sharedLocalPersistPath,
      },
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true,
      },
    }),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  build: {
    sourcemap: false,
  },
});
