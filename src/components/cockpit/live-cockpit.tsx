'use client';

import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { NormalizedEvent, SessionSummary } from '@/lib/events/schema';
import { useEventStream } from '@/hooks/use-event-stream';
import { useSessions } from '@/hooks/use-sessions';
import { Header } from './header';
import { SessionList } from './session-list';
import { SessionPalette } from './session-palette';
import { NowPlaying } from './now-playing';
import { ToolStream } from './tool-stream';
import { StatPanel } from './stat-panel';
import { EmptyState } from './empty-state';

interface SessionDetailResponse {
  summary: SessionSummary;
  events: NormalizedEvent[];
}

export function LiveCockpit() {
  const { sessions, active, loading } = useSessions({ pollMs: 3000 });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (selectedSessionId === null) return;
    const exists = sessions.some((s) => s.sessionId === selectedSessionId);
    if (!exists) setSelectedSessionId(null);
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [history, setHistory] = useState<NormalizedEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!selectedSessionId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/sessions/${selectedSessionId}?limit=500`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SessionDetailResponse | null) => {
        if (cancelled || !data) return;
        setHistory(data.events ?? []);
      })
      .catch(() => {
        /* swallow */
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  const { events: streamed, connected } = useEventStream({
    sessionId: selectedSessionId ?? undefined,
    max: 500,
  });

  const events = useMemo(() => {
    if (!selectedSessionId) return streamed;
    const seen = new Set<string>(history.map((e) => e.id));
    const merged = [...history];
    for (const e of streamed) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        merged.push(e);
      }
    }
    return merged.slice(-500);
  }, [history, streamed, selectedSessionId]);

  const selectedSession = useMemo<SessionSummary | null>(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.sessionId === selectedSessionId) ?? null;
  }, [sessions, selectedSessionId]);

  const hasAnySession = sessions.length > 0;

  return (
    <div className="flex h-screen flex-col">
      <Header
        connected={connected}
        sessionCount={sessions.length}
        activeCount={active}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="grid flex-1 min-h-0 grid-cols-[280px_minmax(0,1fr)_320px] gap-4 px-6 pb-6 pt-4">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
          className="min-h-0"
        >
          <SessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
            loading={loading}
            activeCount={active}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}
          className="flex min-h-0 flex-col gap-4"
        >
          {hasAnySession ? (
            <>
              <NowPlaying events={events} />
              <div className="flex-1 min-h-0">
                <ToolStream events={events} max={50} />
              </div>
            </>
          ) : (
            <div
              className="flex-1 min-h-0 rounded-2xl border"
              style={{
                borderColor: 'var(--color-border)',
                background:
                  'color-mix(in oklch, var(--color-bg-elevated) 50%, transparent)',
              }}
            >
              <EmptyState />
            </div>
          )}
          {historyLoading ? (
            <span className="px-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
              loading history…
            </span>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
          className="min-h-0"
        >
          <StatPanel session={selectedSession} events={events} />
        </motion.div>
      </div>

      <SessionPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        sessions={sessions}
        activeCount={active}
        onSelect={setSelectedSessionId}
      />
    </div>
  );
}
