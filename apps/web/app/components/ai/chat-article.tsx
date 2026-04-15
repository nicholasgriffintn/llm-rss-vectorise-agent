import { FormEvent, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { useEventSource } from '../../lib/use-event-source';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function ChatArticle({ id }: { id: string }) {
  const [question, setQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');

  const eventSourceUrl = useMemo(() => {
    if (!activeQuestion) {
      return null;
    }

    return `/ai/chat?id=${encodeURIComponent(id)}&q=${encodeURIComponent(activeQuestion)}`;
  }, [activeQuestion, id]);

  const { data: chunk, isOpen } = useEventSource(eventSourceUrl || '/ai/chat', {
    closeOnData: '[DONE]',
  });

  const response = useMemo(() => {
    if (!chunk?.length || !activeQuestion) {
      return '';
    }

    try {
      const parsedData = chunk.map((d) => JSON.parse(d));
      return parsedData.reduce((acc, curr) => acc.concat(curr.response), '');
    } catch {
      return '';
    }
  }, [chunk, activeQuestion]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setActiveQuestion(question.trim());
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          placeholder="Ask a question about this article"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" variant="outline">
          Ask
        </Button>
      </form>

      {activeQuestion ? <p className="text-sm"><strong>Question:</strong> {activeQuestion}</p> : null}

      {response ? (
        <div className="prose">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      ) : null}

      {isOpen && activeQuestion ? <span className="cursor">...</span> : null}
    </div>
  );
}
