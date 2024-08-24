import type { MetaFunction } from '@remix-run/cloudflare';
import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';

import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export const meta: MetaFunction = () => {
  return [
    { title: 'LLM Application' },
    {
      name: 'description',
      content: 'An LLM application by Nicholas Griffin.',
    },
  ];
};

const exampleSearches = ['Apple', 'Android', 'Engineering', 'Open-Source'];

export default function Index() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [isIntroVisible, setIsIntroVisible] = useState(true);

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      const mockResults = [
        `Latest article about "${searchQuery}" from TechCrunch`,
        `Breaking news on "${searchQuery}" from BBC`,
        `In-depth analysis of "${searchQuery}" from The Verge`,
      ];
      setResults(mockResults);
      setHasSearched(true);
      setIsIntroVisible(false);
      setQuery(searchQuery);
    } else {
      setResults([]);
      setHasSearched(false);
      setIsIntroVisible(true);
    }
  }, []);

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
          <form
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
          </form>
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
          {results.length > 0 ? (
            <ul className="space-y-4">
              {results.map((result, index) => (
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
