import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from '@remix-run/react';

import './tailwind.css';
import './global.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="min-h-screen bg-background p-0">
          <header className="w-full py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex items-center flex-shrink-0 text-primary mr-6">
                <img
                  src="https://nicholasgriffin.dev/avatar.png"
                  alt="Nicholas Griffin's Avatar"
                  className="h-8 w-8 rounded-full"
                />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <footer className="w-full py-4 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-3xl py-4 px-4 sm:px-6 lg:px-8 m-auto items-center text-center">
              <p className="text-muted-foreground text-xs text-center">
                Please note that this application was created for research
                purposes only, it is not the intention to cause any negative
                affects to the sites that the systems store or display. If you
                would like your site removed from the system, please contact me.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground text-xs">
                Created by{' '}
                <a href="https://nicholasgriffin.dev">Nicholas Griffin</a>
              </span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs">
                Powered by <a href="https://cloudflare.com">Cloudflare</a> and{' '}
                <a href="https://remix.run">Remix</a>
              </span>
            </div>
          </footer>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const ErrorBoundary = () => {
  const error = useRouteError();
  console.error(error);
  return <div>Something went wrong</div>;
};

export default function App() {
  return <Outlet />;
}
