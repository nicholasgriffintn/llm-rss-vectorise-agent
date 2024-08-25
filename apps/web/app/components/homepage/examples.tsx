import { Button } from '../ui/button';

const exampleSearches = ['Apple', 'Android', 'Engineering', 'Open-Source'];

export const ExampleSearches = ({
  handleSearch,
}: {
  handleSearch: (query: string) => void;
}) => (
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
);
