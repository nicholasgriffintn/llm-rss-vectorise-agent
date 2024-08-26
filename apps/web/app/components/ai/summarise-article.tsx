import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

import { useEventSource } from '../../lib/use-event-source';

export function SummariseArticle({ id }: { id: string }) {
  const { data: chunk, isOpen } = useEventSource(`/ai/summarise?id=${id}`, {
    closeOnData: "[DONE]",
  });

  const [response, setResponse] = useState('');

  useEffect(() => {
    if (chunk) {
      try {
        const parsedData = chunk.map((d) => JSON.parse(d));

        if (parsedData.length === 0) {
          return;
        }

        const newResponse = parsedData.reduce((acc, curr) => {
          return acc.concat(curr.response);
        }, '');

        setResponse(newResponse);
      } catch (e) {
        console.error(e);
      }
    }
  }, [chunk]);

  return (
    <>
      {response ? (
        <div className="prose">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      ) : null}
      {isOpen && <span className="cursor">...</span>}
    </>
  );
}
