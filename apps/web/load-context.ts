import { type PlatformProxy } from "wrangler";

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface Future {
    v3_singleFetch: true;
  }

  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}
