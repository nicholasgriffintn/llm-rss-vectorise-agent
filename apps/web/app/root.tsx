import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
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
      <body className="safe-area-padding">
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
                This application was created for research purposes only, it is
                not the intention to cause any negative affects to the sites
                that the systems store or display. If you would like your site
                removed from the system, please contact me.
              </p>
              <p className="text-muted-foreground text-xs text-center">
                Also, when using the AI functionality, please be aware that the
                services are being provided while in active development. I am
                using some &quot;beta&quot; level services, investigating some
                stuff I don&apos;t know a lot about and generally trying to work
                out the best prompts.
              </p>
              <p>
                <strong>DO NOT</strong> use the output of the AI to make any
                decisions, it is provided as research only.
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

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="flex flex-col">
      <div className="w-full max-w-3xl py-4 px-4 sm:px-6 lg:px-8 m-auto items-center text-center">
        <h1 className="text-2xl font-bold text-black">Something went wrong</h1>
        <p className="text-lg text-black mt-2">
          {isRouteErrorResponse(error)
            ? error.statusText
            : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return <Outlet />;
}
