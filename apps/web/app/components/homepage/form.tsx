import { Search } from 'lucide-react';
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
    <Input
      type="text"
      placeholder="Search for a topic or article..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="flex-grow"
    />
    <Button type="submit" className="shrink-0">
      <Search className="h-4 w-4 mr-2" />
      Search
    </Button>
  </Form>
);
