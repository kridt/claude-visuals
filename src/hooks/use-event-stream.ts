'use client';

import { useEffect, useRef, useState } from 'react';
import type { NormalizedEvent } from '@/lib/events/schema';

type Hello = { subscribers: number };

interface Options {
  sessionId?: string;
  max?: number;
}

interface Result {
  events: NormalizedEvent[];
  connected: boolean;
  hello: Hello | null;
}

export function useEventStream(opts?: Options): Result {
  const sessionId = opts?.sessionId;
  const max = opts?.max ?? 500;

  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [hello, setHello] = useState<Hello | null>(null);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setEvents([]);
    setHello(null);

    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
      const es = new EventSource(`/api/events/stream${qs}`);
      esRef.current = es;

      es.onopen = () => {
        if (!cancelled) setConnected(true);
      };

      es.addEventListener('hello', (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(e.data) as Hello;
          setHello(parsed);
        } catch {
          /* ignore */
        }
      });

      es.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(e.data) as NormalizedEvent;
          setEvents((prev) => {
            const next = [...prev, parsed];
            if (next.length > max) {
              return next.slice(next.length - max);
            }
            return next;
          });
        } catch {
          /* ignore malformed payloads */
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        es.close();
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(open, 1000);
      };
    };

    open();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    };
  }, [sessionId, max]);

  return { events, connected, hello };
}
