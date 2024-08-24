import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import './tailwind.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="min-h-screen bg-background flex flex-col items-center p-0 text-center">
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
          <main className="flex-1">{children}</main>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}