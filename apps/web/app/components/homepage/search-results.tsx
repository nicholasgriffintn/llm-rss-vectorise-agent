import { ArrowRight } from 'lucide-react';

import { SearchResultItem } from './search-result-item';
import { Button } from '../ui/button';

export const SearchResults = ({
  data,
}: {
  data: {
    count: number;
    matches: {
      title: string;
      description: string;
      url: string;
      metadata: {
        title: string;
        description: string;
        url: string;
      };
    }[];
  };
}) => (
  <div className="w-full mt-4">
    <h2 className="text-2xl font-bold mb-6 text-left">Search Results</h2>
    {data ? (
      <ul className="space-y-4">
        {data?.matches?.length > 0 ? (
          data.matches.map((result, index) => (
            <SearchResultItem key={index} result={result} />
          ))
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </ul>
    ) : (
      <p className="text-muted-foreground">No results found.</p>
    )}
    {data?.matches?.length > 0 && data.count >= 15 && (
      <div className="mt-8 text-center">
        <Button variant="outline" disabled>
          Load More <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
);
