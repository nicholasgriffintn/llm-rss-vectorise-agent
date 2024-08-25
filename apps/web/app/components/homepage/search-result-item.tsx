import { Button } from '../ui/button';
import { Modal } from '../modal/base';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString(undefined, options);
}

function stripHtmlTagsAndDecode(html: string): string {
  // Strip HTML tags
  const text = html.replace(/<\/?[^>]+(>|$)/g, '');

  // Decode HTML entities
  return text
    .replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => {
      const entities: { [key: string]: string } = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        // Add more entities if needed
      };
      return entities[entity] || match;
    });
}

export const SearchResultItem = ({
  result,
}: {
  result: {
    metadata: {
      title: string;
      description: string;
      url: string;
      author?: string;
      published?: string;
      updated?: string;
    };
    score: number;
  };
}) => (
  <li className="bg-card text-card-foreground rounded-lg shadow relative">
    {result.score && (
      <span className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
        {Math.round(result.score * 100)}% match
      </span>
    )}
    <img
      src="https://via.placeholder.com/150"
      alt="Placeholder"
      className="w-full h-16 object-cover rounded-t-lg"
    />
    <div className="p-4">
      <a
        href={result.metadata.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-bold"
      >
        {result.metadata.title}
      </a>
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {result.metadata.author && (
          <span className="text-xs text-muted-foreground">
            Author: {result.metadata.author}
          </span>
        )}
        {result.metadata.published && (
          <span className="text-xs text-muted-foreground">
            Published: {formatDate(result.metadata.published)}
          </span>
        )}
        {result.metadata.updated && (
          <span className="text-xs text-muted-foreground">
            Updated: {formatDate(result.metadata.updated)}
          </span>
        )}
      </div>
      {result.metadata.description && (
        <p className="text-sm text-muted-foreground">
          {stripHtmlTagsAndDecode(result.metadata.description)}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Modal
          trigger={
            <Button variant="outline" size="sm" className="text-xs">
              Summarise
            </Button>
          }
          title="Summarise article"
          description="Use AI to generate a summary of the article."
        >
          <div className="flex items-center space-x-2">Coming soon...</div>
        </Modal>
        <Modal
          trigger={
            <Button variant="outline" size="sm" className="text-xs">
              Analyse
            </Button>
          }
          title="Analyse article"
          description="Use AI to analyse the article."
        >
          <div className="flex items-center space-x-2">Coming soon...</div>
        </Modal>
      </div>
    </div>
  </li>
);
