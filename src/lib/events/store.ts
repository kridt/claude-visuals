import { encodeProjectDir } from "@/lib/paths";
import type { NormalizedEvent, SessionSummary } from "@/lib/events/schema";

const MAX_EVENTS_PER_SESSION = 50_000;

type SessionBucket = {
  events: NormalizedEvent[];
  eventIds: Set<string>;
  summary: SessionSummary;
  isActive: boolean;
  subagentParents: Set<string>;
};

const sessions = new Map<string, SessionBucket>();

function emptySummary(sessionId: string): SessionSummary {
  return {
    sessionId,
    projectDir: "",
    totalEvents: 0,
    toolCalls: 0,
    subagents: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    isActive: false,
  };
}

function getOrCreate(sessionId: string): SessionBucket {
  const existing = sessions.get(sessionId);
  if (existing) return existing;
  const bucket: SessionBucket = {
    events: [],
    eventIds: new Set(),
    summary: emptySummary(sessionId),
    isActive: false,
    subagentParents: new Set(),
  };
  sessions.set(sessionId, bucket);
  return bucket;
}

function applyEventToSummary(bucket: SessionBucket, ev: NormalizedEvent): void {
  const s = bucket.summary;
  s.totalEvents = bucket.events.length;

  if (ev.cwd && ev.cwd.length > 0) {
    s.cwd = ev.cwd;
    s.projectDir = encodeProjectDir(ev.cwd);
  }
  if (ev.gitBranch && ev.gitBranch.length > 0) {
    s.branch = ev.gitBranch;
  }

  if (!s.startedAt || ev.timestamp < s.startedAt) s.startedAt = ev.timestamp;
  if (!s.lastActivityAt || ev.timestamp > s.lastActivityAt) {
    s.lastActivityAt = ev.timestamp;
  }

  switch (ev.kind) {
    case "tool_use": {
      s.toolCalls += 1;
      if (ev.agent === "subagent" && ev.parentUuid) {
        if (!bucket.subagentParents.has(ev.parentUuid)) {
          bucket.subagentParents.add(ev.parentUuid);
          s.subagents = bucket.subagentParents.size;
        }
      }
      break;
    }
    case "usage": {
      s.inputTokens += ev.inputTokens;
      s.outputTokens += ev.outputTokens;
      s.cacheReadTokens += ev.cacheReadTokens;
      s.cacheCreationTokens += ev.cacheCreationTokens;
      break;
    }
    case "session_meta": {
      if (ev.field === "title") s.title = ev.value;
      if (ev.field === "branch") s.branch = ev.value;
      if (ev.field === "version") s.version = ev.value;
      break;
    }
    default:
      break;
  }
}

export const eventStore = {
  add(event: NormalizedEvent): void {
    const bucket = getOrCreate(event.sessionId);
    if (bucket.eventIds.has(event.id)) return;
    bucket.eventIds.add(event.id);
    bucket.events.push(event);

    if (bucket.events.length > MAX_EVENTS_PER_SESSION) {
      const dropped = bucket.events.shift();
      if (dropped) bucket.eventIds.delete(dropped.id);
    }

    applyEventToSummary(bucket, event);
    bucket.summary.isActive = bucket.isActive;
  },

  getAll(): NormalizedEvent[] {
    const out: NormalizedEvent[] = [];
    for (const b of sessions.values()) {
      for (const e of b.events) out.push(e);
    }
    return out;
  },

  getBySession(sessionId: string): NormalizedEvent[] {
    const b = sessions.get(sessionId);
    return b ? b.events.slice() : [];
  },

  getSessions(): SessionSummary[] {
    const out: SessionSummary[] = [];
    for (const b of sessions.values()) {
      out.push({ ...b.summary, isActive: b.isActive });
    }
    return out;
  },

  getSession(sessionId: string): SessionSummary | undefined {
    const b = sessions.get(sessionId);
    if (!b) return undefined;
    return { ...b.summary, isActive: b.isActive };
  },

  markSessionActive(sessionId: string, isActive: boolean): void {
    const b = getOrCreate(sessionId);
    b.isActive = isActive;
    b.summary.isActive = isActive;
  },

  clear(): void {
    sessions.clear();
  },
};
