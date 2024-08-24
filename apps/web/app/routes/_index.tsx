import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';

import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { handleQuery } from '../lib/ai';

export const meta: MetaFunction = () => {
  return [
    { title: 'LLM Application' },
    {
      name: 'description',
      content: 'An LLM application by Nicholas Griffin.',
    },
  ];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env } = context.cloudflare;

  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (query) {
    const result = handleQuery(query, env);

    return json(result);
  }

  return json([]);
}

const exampleSearches = ['Apple', 'Android', 'Engineering', 'Open-Source'];

export default function Index() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isIntroVisible, setIsIntroVisible] = useState(true);

  const data = useLoaderData<typeof loader>();
  console.log(data);
  const submit = useSubmit();

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (searchQuery.trim()) {
        setHasSearched(true);
        setIsIntroVisible(false);
        setQuery(searchQuery);
        submit({ query: searchQuery });
      } else {
        setHasSearched(false);
        setIsIntroVisible(true);
      }
    },
    [submit]
  );

  return (
    <>
      <div
        className={`w-full max-w-3xl transition-all duration-500 ease-in-out ${
          hasSearched ? 'mt-8' : 'mt-[15vh]'
        }`}
      >
        {isIntroVisible && (
          <div
            className={`mb-4 transition-opacity duration-500 ease-in-out ${
              hasSearched ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Find the Latest News
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Discover breaking news, trending topics, and hidden gems from
                across the web, all in one place.
              </p>
            </div>
          </div>
        )}
        <div className="w-full space-y-2">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" className="shrink-0">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </Form>
        </div>
        {isIntroVisible && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {exampleSearches.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => handleSearch(example)}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        )}
      </div>

      {hasSearched && (
        <div className="w-full max-w-2xl mt-8">
          <h2 className="text-2xl font-bold mb-4">Search Results</h2>
          {data?.length > 0 ? (
            <ul className="space-y-4">
              {data.map((result, index) => (
                <li
                  key={index}
                  className="bg-card text-card-foreground p-4 rounded-lg shadow"
                >
                  {result}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No results found.</p>
          )}
        </div>
      )}
    </>
  );
}
