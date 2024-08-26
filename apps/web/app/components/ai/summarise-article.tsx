import { useFetcher } from '@remix-run/react';

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
      <h2>Summarise Article</h2>
      <button onClick={handleSummarise}>Summarise</button>
    </div>
  );
}
