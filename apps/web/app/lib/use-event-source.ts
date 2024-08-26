// Sourced from: https://github.com/ananni13/remix-openai-sse/blob/main/app/lib/use-event-source.ts

import { useEffect, useState } from 'react';

type EventSourceOptions = {
  init?: EventSourceInit;
  event?: string;
  closeOnData?: string;
};

/**
 * Subscribe to an event source and return the latest event.
 * @param url The URL of the event source to connect to
 * @param options The options to pass to the EventSource constructor
 * @returns The last event received from the server
 */
export function useEventSource(
  url: string | URL,
  { event = 'message', closeOnData, init }: EventSourceOptions = {}
) {
  const [data, setData] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(url, init);
    eventSource.addEventListener(event ?? 'message', handler);

    // reset data if dependencies change
    setData(null);
    setIsOpen(true);

    function handler(event: MessageEvent) {
      if (event.data === closeOnData) {
        close();
        return;
      }
      setData(event.data || 'UNKNOWN_EVENT_DATA');
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
