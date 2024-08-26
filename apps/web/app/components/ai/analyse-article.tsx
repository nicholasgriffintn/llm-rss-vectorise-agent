import { useFetcher } from '@remix-run/react';

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
      <h2>Analyse Article</h2>
      <button onClick={handleAnalyse}>Analyse</button>
    </div>
  );
}
