import { useFetcher } from '@remix-run/react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export function AnalyseArticle({ id }: { id: string }) {
  const analyseArticle = useFetcher<string>();

  const [response, setResponse] = useState('');

  useEffect(() => {
    if (analyseArticle.data) {
      const dataStream = analyseArticle.data.split('\n');
      dataStream.forEach((data) => {
        if (data && data !== 'data: [DONE]') {
          try {
            const jsonString = data.replace('data: ', '');
            const parsedData = JSON.parse(jsonString);
            setResponse((prevResponse) => prevResponse + parsedData.response);
          } catch (error) {
            console.error('Failed to parse JSON:', error);
          }
        }
      });
    }
  }, [analyseArticle.data]);

  const handleanalyse = async () => {
    analyseArticle.submit(
      { id },
      { action: '/action/ai-analyse', method: 'post' }
    );
  };

  useEffect(() => {
    handleanalyse();
  }, []);

  return (
    <div>
      {analyseArticle.state === 'submitting' && <p>Analysing...</p>}
      {analyseArticle.state === 'loading' && <p>Loading...</p>}
      {analyseArticle?.data ? (
        <div className="prose">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
