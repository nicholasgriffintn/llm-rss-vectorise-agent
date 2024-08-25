import { Button } from '../ui/button';
import { Modal } from '../modal/base';

function stripHtmlTags(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export const SearchResultItem = ({
  result,
}: {
  result: {
    metadata: {
      title: string;
      description: string;
      url: string;
    };
  };
}) => (
  <li className="bg-card text-card-foreground p-4 rounded-lg shadow">
    <a
      href={result.metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-lg font-bold"
    >
      {result.metadata.title}
    </a>
    {result.metadata.description && (
      <p className="text-sm text-muted-foreground">
        {stripHtmlTags(result.metadata.description)}
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
  </li>
);
