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
        const parsedChunk = JSON.parse(chunk);

        if (parsedChunk.response) {
          setResponse((r) => r.concat(parsedChunk.response));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [chunk]);

  return (
    <>
      {response ? (
        <ReactMarkdown>{response}</ReactMarkdown>
      ) : null}
      {isOpen && <span className="cursor">...</span>}
    </>
  );
}
