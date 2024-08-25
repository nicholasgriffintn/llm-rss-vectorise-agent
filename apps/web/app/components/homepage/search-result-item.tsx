import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

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
        {result.metadata.description}
      </p>
    )}
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            Summarise
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Summarise article</DialogTitle>
            <DialogDescription>
              Use AI to generate a summary of the article.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">Coming soon...</div>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            Analyse
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Analyse article</DialogTitle>
            <DialogDescription>
              Use AI to analyse the article.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">Coming soon...</div>
        </DialogContent>
      </Dialog>
    </div>
  </li>
);
