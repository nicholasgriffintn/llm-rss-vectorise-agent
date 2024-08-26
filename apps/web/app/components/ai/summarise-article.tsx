import { useFetcher } from '@remix-run/react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export function SummariseArticle({ id }: { id: string }) {
  const summariseArticle = useFetcher<string>();

  const [response, setResponse] = useState('');

  useEffect(() => {
    if (summariseArticle.data) {
      const dataStream = summariseArticle.data.split('\n');
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
  }, [summariseArticle.data]);

  const handleSummarise = async () => {
    summariseArticle.submit(
      { id },
      { action: '/action/ai-summarise', method: 'post' }
    );
  };

  useEffect(() => {
    handleSummarise();
  }, []);

  return (
    <>
      {summariseArticle.state === 'submitting' && <p>Summarising...</p>}
      {summariseArticle.state === 'loading' && <p>Loading...</p>}
      {summariseArticle?.data ? (
        <div className="prose">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      ) : null}
    </>
  );
}
