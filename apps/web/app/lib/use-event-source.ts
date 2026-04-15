// Sourced from: https://github.com/ananni13/remix-openai-sse/blob/main/app/lib/use-event-source.ts

import { useEffect, useState } from 'react';

type EventSourceOptions = {
  init?: EventSourceInit;
  event?: string;
  closeOnData?: string;
  setResponse?: (data: string) => void;
};

export function useEventSource(
  url: string | URL | null,
  { event = 'message', closeOnData, init }: EventSourceOptions = {}
) {
  const [data, setData] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!url) {
      setData([]);
      setIsOpen(false);
      return;
    }

    const eventSource = new EventSource(url, init);
    eventSource.addEventListener(event ?? 'message', handler);

    setData([]);
    setIsOpen(true);

    function handler(event: MessageEvent) {
      if (event.data === closeOnData) {
        close();
        return;
      }
      setData((prevData) => [...prevData, event.data]);
    }

    function close() {
      eventSource.removeEventListener(event ?? 'message', handler);
      eventSource.close();
      setIsOpen(false);
    }

    return () => close();
  }, [url, event, closeOnData, init]);

  return { data, isOpen };
}
