import { useFetcher } from '@remix-run/react';

import { Button } from '../ui/button';

export function AnalyseArticle({ id }: { id: string }) {
  const analyseArticle = useFetcher();

  const handleAnalyse = async () => {
    analyseArticle.submit(
      { id },
      { action: '/action/ai-analyse', method: 'post' }
    );
  };

  return (
    <div>
      <h2>
        This won&apos;t do anything yet, clicking the button below will call the
        API, however, I&apos;m yet to figure out streaming.
      </h2>
      <Button onClick={handleAnalyse}>Analyse</Button>
    </div>
  );
}
