import { Search, X } from 'lucide-react';
import { Form } from '@remix-run/react';

import { Input } from '../ui/input';
import { Button } from '../ui/button';

export const SearchForm = ({
  query,
  setQuery,
  handleSearch,
}: {
  query: string;
  setQuery: (value: string) => void;
  handleSearch: (query: string) => void;
}) => (
  <Form
    onSubmit={(e) => {
      e.preventDefault();
      handleSearch(query);
    }}
    className="flex gap-2"
  >
    <div className="relative flex-grow">
      <Input
        type="text"
        placeholder="Search for a topic or article..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-grow pr-10"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search query</span>
        </button>
      )}
    </div>
    <Button type="submit" className="shrink-0">
      <Search className="h-4 w-4 mr-2" />
      Search
    </Button>
  </Form>
);
