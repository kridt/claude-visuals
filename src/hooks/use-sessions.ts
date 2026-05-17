'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '@/lib/events/schema';

interface Options {
  pollMs?: number;
}

interface Result {
  sessions: SessionSummary[];
  active: number;
  loading: boolean;
  refetch(): void;
}

interface SessionsResponse {
  sessions: SessionSummary[];
  active: number;
}

export function useSessions(opts?: Options): Result {
  const pollMs = opts?.pollMs ?? 3000;

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      if (cancelledRef.current) return;
      setSessions(data.sessions ?? []);
      setActive(data.active ?? 0);
    } catch {
      /* swallow — keep last good state */
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    fetchSessions();
    const id = setInterval(fetchSessions, pollMs);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [pollMs, fetchSessions]);

  return { sessions, active, loading, refetch: fetchSessions };
}
