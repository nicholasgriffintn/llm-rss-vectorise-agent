import { ArrowRight } from 'lucide-react';

import { SearchResultItem } from './search-result-item';
import { Button } from '../ui/button';

const getImagePosition = (
  index: number,
  result: {
    id?: string;
    metadata: {
      title: string;
      description: string;
      url: string;
      author?: string;
      published?: string;
      updated?: string;
    };
    score: number;
  }
): string => {
  const positions = ['left', 'top', 'right'];

  // Use the length of the title and description to influence the position
  const titleLength = result?.metadata?.title?.length || 0;
  const descriptionLength = result?.metadata?.description?.length || 0;
  const score = result?.score || 0;

  // Generate a pseudo-random number based on the title and description lengths
  const randomFactor =
    (titleLength + descriptionLength + Math.round(score * 100) + index) %
    positions.length;

  return positions[randomFactor];
};

type SearchResultMatch = {
  id?: string;
  metadata?: Record<string, unknown>;
  score: number;
};

type SearchResultsData = {
  count: number;
  matches: Array<SearchResultMatch | null>;
};

function hasRenderableMetadata(match: SearchResultMatch | null): match is {
  id?: string;
  metadata: {
    title: string;
    description: string;
    url: string;
    author?: string;
    published?: string;
    updated?: string;
    [key: string]: unknown;
  };
  score: number;
} {
  if (!match) {
    return false;
  }

  return Boolean(
    match.metadata &&
      typeof match.metadata.title === 'string' &&
      typeof match.metadata.description === 'string' &&
      typeof match.metadata.url === 'string'
  );
}

export const SearchResults = ({
  data,
}: {
  data: SearchResultsData;
}) => {
  const renderableMatches = data.matches.filter(hasRenderableMetadata);

  return (
    <div className="w-full mt-4">
      <h2 className="text-2xl font-bold mb-6 text-left">Search Results</h2>
      <ul className="space-y-4">
        {renderableMatches.length > 0 ? (
          renderableMatches.map((result, index) => (
            <SearchResultItem
              key={result.id || `${result.metadata.url}-${index}`}
              result={{
                ...result,
                id: result.id || `${result.metadata.url}-${index}`,
              }}
              imagePosition={getImagePosition(index, result)}
            />
          ))
        ) : (
          <p className="text-muted-foreground">No results found.</p>
        )}
      </ul>
      {renderableMatches.length > 0 && data.count >= 15 && (
      <div className="mt-8 text-center">
        <Button variant="outline" disabled>
          Load More <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      )}
    </div>
  );
};
