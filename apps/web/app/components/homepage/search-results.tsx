import { SearchResultItem } from './search-result-item';

export const SearchResults = ({
  data,
}: {
  data: {
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
    <h2 className="text-2xl font-bold mb-4">Search Results</h2>
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
  </div>
);
