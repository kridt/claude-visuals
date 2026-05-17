'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEventStream } from '@/hooks/use-event-stream';
import { useSessions } from '@/hooks/use-sessions';
import { useSceneState } from '@/components/cockpit/scene/use-scene-state';
import { SessionPalette } from '@/components/cockpit/session-palette';
import type { NormalizedEvent, SessionSummary } from '@/lib/events/schema';
import { BridgeLoader } from './bridge-loader';
import { MissionControl } from './panels/mission-control';
import { SessionRoster } from './panels/session-roster';
import { Telemetry } from './panels/telemetry';
import { ToolStreamStrip } from './panels/tool-stream-strip';
import { TopHud } from './panels/top-hud';

interface SessionDetailResponse {
  summary: SessionSummary;
  events: NormalizedEvent[];
}

export function BridgeContainer() {
  const { sessions, active } = useSessions({ pollMs: 3000 });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [history, setHistory] = useState<NormalizedEvent[]>([]);

  useEffect(() => {
    if (selectedSessionId !== null) return;
    if (sessions.length === 0) return;
    const sorted = [...sessions].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const at = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bt = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bt - at;
    });
    const first = sorted[0];
    if (first) setSelectedSessionId(first.sessionId);
  }, [sessions, selectedSessionId]);

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

  useEffect(() => {
    if (!selectedSessionId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
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

  const selectedSession = useMemo<SessionSummary | undefined>(() => {
    if (!selectedSessionId) return undefined;
    return sessions.find((s) => s.sessionId === selectedSessionId);
  }, [sessions, selectedSessionId]);

  const sceneState = useSceneState(events);

  return (
    <>
      <BridgeLoader
        sceneState={sceneState}
        topHud={
          <TopHud
            activeCount={active}
            totalCount={sessions.length}
            connected={connected}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        }
        leftPanel={
          <SessionRoster
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />
        }
        centerPanel={
          <MissionControl
            events={events}
            sessionSummary={selectedSession}
          />
        }
        rightPanel={
          <Telemetry summary={selectedSession} events={events} />
        }
        bottomStrip={<ToolStreamStrip events={events} />}
      />

      <SessionPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        sessions={sessions}
        activeCount={active}
        onSelect={setSelectedSessionId}
      />
    </>
  );
}
