'use client';

import { useMemo, useRef } from 'react';
import {
  categorizeTool,
  type NormalizedEvent,
  type ToolCategory,
} from '@/lib/events/schema';
import type { SceneStatus } from './tool-color';

export interface SubagentDescriptor {
  id: string;
  toolCategory: ToolCategory;
  bornAt: number;
}

export interface ToolArcDescriptor {
  id: string;
  toolCategory: ToolCategory;
  bornAt: number;
  doneAt: number | null;
}

export interface SceneState {
  status: SceneStatus;
  toolCategory: ToolCategory | undefined;
  subagents: SubagentDescriptor[];
  toolArcs: ToolArcDescriptor[];
}

const SUBAGENT_TTL_MS = 60_000;
const ERROR_STICKY_MS = 2_000;
const MAX_ARCS = 8;
const MAX_SUBAGENTS = 12;

function parseTs(v: string | undefined): number {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

function arraysEqualShallow<T>(
  a: readonly T[],
  b: readonly T[],
  eq: (x: T, y: T) => boolean,
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined || bi === undefined) return false;
    if (!eq(ai, bi)) return false;
  }
  return true;
}

function subagentEq(a: SubagentDescriptor, b: SubagentDescriptor): boolean {
  return (
    a.id === b.id &&
    a.toolCategory === b.toolCategory &&
    a.bornAt === b.bornAt
  );
}

function arcEq(a: ToolArcDescriptor, b: ToolArcDescriptor): boolean {
  return (
    a.id === b.id &&
    a.toolCategory === b.toolCategory &&
    a.bornAt === b.bornAt &&
    a.doneAt === b.doneAt
  );
}

export function useSceneState(events: NormalizedEvent[]): SceneState {
  const subagentsRef = useRef<SubagentDescriptor[]>([]);
  const arcsRef = useRef<ToolArcDescriptor[]>([]);

  return useMemo(() => {
    const now = Date.now();

    const openToolUses = new Map<
      string,
      { ts: number; category: ToolCategory }
    >();
    const resultsByUseId = new Map<string, { ts: number; isError: boolean }>();

    for (const e of events) {
      if (e.kind === 'tool_result') {
        resultsByUseId.set(e.toolUseId, {
          ts: parseTs(e.timestamp),
          isError: Boolean(e.isError),
        });
      }
    }

    let latestThinkingTs = 0;
    let latestErrorTs = 0;
    let latestEventTs = 0;

    const subagentBuckets = new Map<
      string,
      { bornAt: number; lastTs: number; lastCategory: ToolCategory }
    >();

    type ArcSeed = {
      id: string;
      toolCategory: ToolCategory;
      bornAt: number;
      doneAt: number | null;
    };
    const arcSeeds: ArcSeed[] = [];

    for (const e of events) {
      const ts = parseTs(e.timestamp);
      if (ts > latestEventTs) latestEventTs = ts;

      if (e.kind === 'tool_use') {
        const category = categorizeTool(e.toolName);
        const matched = resultsByUseId.get(e.toolUseId);
        if (!matched) {
          openToolUses.set(e.toolUseId, { ts, category });
        }
        arcSeeds.push({
          id: e.toolUseId,
          toolCategory: category,
          bornAt: ts || now,
          doneAt: matched ? matched.ts || now : null,
        });

        if (e.agent === 'subagent') {
          const bucketKey = e.parentUuid ?? e.toolUseId;
          const existing = subagentBuckets.get(bucketKey);
          if (existing) {
            if (ts < existing.bornAt) existing.bornAt = ts;
            if (ts > existing.lastTs) {
              existing.lastTs = ts;
              existing.lastCategory = category;
            }
          } else {
            subagentBuckets.set(bucketKey, {
              bornAt: ts || now,
              lastTs: ts || now,
              lastCategory: category,
            });
          }
        }
      } else if (e.kind === 'tool_result') {
        if (e.isError && ts > latestErrorTs) latestErrorTs = ts;
      } else if (e.kind === 'assistant_thinking') {
        if (ts > latestThinkingTs) latestThinkingTs = ts;
      }
    }

    let status: SceneStatus = 'idle';
    let toolCategory: ToolCategory | undefined;

    if (latestErrorTs > 0 && now - latestErrorTs < ERROR_STICKY_MS) {
      status = 'error';
    } else if (openToolUses.size > 0) {
      let latestTs = 0;
      let latestCategory: ToolCategory = 'other';
      for (const v of openToolUses.values()) {
        if (v.ts >= latestTs) {
          latestTs = v.ts;
          latestCategory = v.category;
        }
      }
      status = 'running_tool';
      toolCategory = latestCategory;
    } else if (latestThinkingTs > 0 && latestThinkingTs === latestEventTs) {
      status = 'thinking';
    }

    const cutoff = now - SUBAGENT_TTL_MS;
    const nextSubagents: SubagentDescriptor[] = [];
    for (const [id, info] of subagentBuckets) {
      if (info.lastTs < cutoff) continue;
      nextSubagents.push({
        id,
        toolCategory: info.lastCategory,
        bornAt: info.bornAt,
      });
    }
    nextSubagents.sort((a, b) => a.bornAt - b.bornAt);
    const trimmedSubagents = nextSubagents.slice(-MAX_SUBAGENTS);

    const trimmedArcs = arcSeeds.slice(-MAX_ARCS);

    let subagentsResult = trimmedSubagents;
    if (
      arraysEqualShallow(
        subagentsRef.current,
        trimmedSubagents,
        subagentEq,
      )
    ) {
      subagentsResult = subagentsRef.current;
    } else {
      subagentsRef.current = trimmedSubagents;
    }

    let arcsResult = trimmedArcs;
    if (arraysEqualShallow(arcsRef.current, trimmedArcs, arcEq)) {
      arcsResult = arcsRef.current;
    } else {
      arcsRef.current = trimmedArcs;
    }

    return {
      status,
      toolCategory,
      subagents: subagentsResult,
      toolArcs: arcsResult,
    };
  }, [events]);
}
