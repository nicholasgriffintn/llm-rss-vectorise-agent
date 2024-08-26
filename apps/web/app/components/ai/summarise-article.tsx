import { useFetcher } from '@remix-run/react';

import { Button } from '../ui/button';

export function SummariseArticle({ id }: { id: string }) {
  const summariseArticle = useFetcher();

  const handleSummarise = async () => {
    summariseArticle.submit(
      { id },
      { action: '/action/ai-summarise', method: 'post' }
    );
  };

  return (
    <div>
      <h2>
        This won&apos;t do anything yet, clicking the button below will call the
        API, however, I&apos;m yet to figure out streaming.
      </h2>
      <Button onClick={handleSummarise}>Summarise</Button>
    </div>
  );
}
