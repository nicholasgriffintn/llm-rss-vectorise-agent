import { useEffect, useState } from 'react';

import { Button } from '../ui/button';

type NotesPayload = {
  success?: boolean;
  notes?: string;
};

export function ArticleNotes({ id }: { id: string }) {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let mounted = true;

    fetch(`/ai/notes?id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((payload) => {
        const typedPayload = payload as NotesPayload;
        if (mounted && typedPayload?.success) {
          setNotes(typedPayload.notes || '');
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus('Failed to load notes');
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const saveNotes = async () => {
    setStatus('Saving...');

    const response = await fetch(`/ai/notes?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });

    if (response.ok) {
      setStatus('Saved');
    } else {
      setStatus('Failed to save');
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        className="w-full min-h-32 p-2 border rounded bg-background"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your notes about this article"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{status}</span>
        <Button size="sm" variant="outline" onClick={saveNotes}>
          Save notes
        </Button>
      </div>
    </div>
  );
}
