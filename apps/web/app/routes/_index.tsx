import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useState, useCallback } from 'react';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useSubmit, useNavigation } from '@remix-run/react';

import { handleQuery } from '../lib/ai';
import { IntroSection } from '../components/homepage/intro';
import { SearchForm } from '../components/homepage/form';
import { ExampleSearches } from '../components/homepage/examples';
import { SearchResults } from '../components/homepage/search-results';
import { LoadingSpinner } from '../components/loading/spinner';

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
    const result = await handleQuery(query, env);
    return json({ result, query, hasSearched: true, isIntroVisible: false });
  }

  return json({ result: [], query, hasSearched: false, isIntroVisible: true });
}

export default function Index() {
  const { state } = useNavigation();

  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [query, setQuery] = useState(data.query || '');
  const [hasSearched, setHasSearched] = useState(data.hasSearched);
  const [isIntroVisible, setIsIntroVisible] = useState(data.isIntroVisible);

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
        setQuery('');
        submit({ query: '' });
      }
    },
    [submit]
  );

  return (
    <div className="flex flex-col">
      <div className="w-full max-w-3xl py-4 px-4 sm:px-6 lg:px-8 m-auto items-center text-center">
        <div
          className={`transition-all duration-500 ease-in-out ${
            hasSearched ? 'mt-8' : 'mt-[5vh] lg:mt-[15vh]'
          }`}
        >
          {isIntroVisible && <IntroSection hasSearched={hasSearched} />}
          <div className="w-full space-y-2">
            <SearchForm
              query={query}
              setQuery={setQuery}
              handleSearch={handleSearch}
            />
          </div>
          {isIntroVisible && <ExampleSearches handleSearch={handleSearch} />}
        </div>
        {state !== 'idle' && hasSearched ? (
          <LoadingSpinner className="mt-8">
            <span className="ml-2">Loading results...</span>
          </LoadingSpinner>
        ) : (
          <>{hasSearched && <SearchResults data={data?.result || {}} />}</>
        )}
      </div>
    </div>
  );
}