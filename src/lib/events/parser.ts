import {
  NormalizedEvent,
  RawAssistantLine,
  RawLine,
  RawSystemLine,
  RawUserLine,
} from "@/lib/events/schema";
import { truncate } from "@/lib/utils";

type Json = unknown;

const loggedMismatches = new Map<string, number>();

function logSchemaMismatch(type: string, msg: string): void {
  const key = `${type}|${msg}`;
  const n = (loggedMismatches.get(key) ?? 0) + 1;
  loggedMismatches.set(key, n);
  if (n === 1 || n === 10 || n === 100 || n % 1000 === 0) {
    console.warn(`[parser] schema mismatch (${n}x) type=${type}: ${msg}`);
  }
}

function hashString(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function safeStringify(value: Json): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function asAgent(isSidechain: boolean | undefined): "main" | "subagent" {
  return isSidechain === true ? "subagent" : "main";
}

function makeId(
  sessionId: string,
  sourceUuid: string | undefined,
  blockIndex: number,
  kind: string,
): string {
  const u = sourceUuid ?? "_";
  return `${sessionId}:${u}:${blockIndex}:${kind}`;
}

function pickTimestamp(raw: { timestamp?: string }): string {
  return raw.timestamp ?? new Date().toISOString();
}

type TextBlk = { type: "text"; text: string };
type ThinkBlk = { type: "thinking"; thinking?: string; signature?: string };
type ToolUseBlk = { type: "tool_use"; id: string; name: string; input?: unknown };
type ToolResultBlk = {
  type: "tool_result";
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
};

function isText(b: { type: string }): b is TextBlk {
  return b.type === "text" && typeof (b as Record<string, unknown>).text === "string";
}
function isThinking(b: { type: string }): b is ThinkBlk {
  return b.type === "thinking";
}
function isToolUse(b: { type: string }): b is ToolUseBlk {
  const o = b as Record<string, unknown>;
  return b.type === "tool_use" && typeof o.id === "string" && typeof o.name === "string";
}
function isToolResult(b: { type: string }): b is ToolResultBlk {
  const o = b as Record<string, unknown>;
  return b.type === "tool_result" && typeof o.tool_use_id === "string";
}

function normalizeUser(raw: RawUserLine): NormalizedEvent[] {
  const out: NormalizedEvent[] = [];
  const sessionId = raw.sessionId;
  const sourceUuid = raw.uuid;
  const timestamp = pickTimestamp(raw);
  const agent = asAgent(raw.isSidechain);
  const base = {
    sessionId,
    agent,
    timestamp,
    parentUuid: raw.parentUuid ?? null,
    sourceUuid,
    cwd: raw.cwd,
    gitBranch: raw.gitBranch,
  } as const;

  const content = raw.message.content;

  if (typeof content === "string") {
    if (content.length > 0) {
      out.push({
        ...base,
        kind: "user_message",
        id: makeId(sessionId, sourceUuid, 0, "user_message"),
        text: content,
      });
    }
    return out;
  }

  let i = 0;
  for (const block of content) {
    if (isText(block)) {
      if (block.text.length > 0) {
        out.push({
          ...base,
          kind: "user_message",
          id: makeId(sessionId, sourceUuid, i, "user_message"),
          text: block.text,
        });
      }
    } else if (isToolResult(block)) {
      const c = block.content;
      let preview: string | undefined;
      if (typeof c === "string") {
        preview = truncate(c, 240);
      } else if (Array.isArray(c)) {
        const text = c
          .map((part) => {
            if (
              part &&
              typeof part === "object" &&
              (part as { type?: unknown }).type === "text" &&
              typeof (part as { text?: unknown }).text === "string"
            ) {
              return (part as { text: string }).text;
            }
            return "";
          })
          .join("");
        preview = truncate(text, 240);
      } else if (c !== undefined) {
        preview = truncate(safeStringify(c), 240);
      }
      out.push({
        ...base,
        kind: "tool_result",
        id: makeId(sessionId, sourceUuid, i, "tool_result"),
        toolUseId: block.tool_use_id,
        isError: block.is_error,
        output: c,
        outputPreview: preview,
      });
    }
    i += 1;
  }
  return out;
}

function normalizeAssistant(raw: RawAssistantLine): NormalizedEvent[] {
  const out: NormalizedEvent[] = [];
  const sessionId = raw.sessionId;
  const sourceUuid = raw.uuid;
  const timestamp = pickTimestamp(raw);
  const agent = asAgent(raw.isSidechain);
  const model = raw.message.model;
  const stopReason = raw.message.stop_reason ?? null;
  const base = {
    sessionId,
    agent,
    timestamp,
    parentUuid: raw.parentUuid ?? null,
    sourceUuid,
    cwd: raw.cwd,
    gitBranch: raw.gitBranch,
  } as const;

  let i = 0;
  for (const block of raw.message.content) {
    if (isText(block)) {
      if (block.text.length > 0) {
        out.push({
          ...base,
          kind: "assistant_text",
          id: makeId(sessionId, sourceUuid, i, "assistant_text"),
          model,
          text: block.text,
          stopReason,
        });
      }
    } else if (isThinking(block)) {
      const text = block.thinking ?? "";
      if (text.length > 0) {
        out.push({
          ...base,
          kind: "assistant_thinking",
          id: makeId(sessionId, sourceUuid, i, "assistant_thinking"),
          model,
          text,
        });
      }
    } else if (isToolUse(block)) {
      const inputPreview = truncate(safeStringify(block.input), 240);
      out.push({
        ...base,
        kind: "tool_use",
        id: makeId(sessionId, sourceUuid, i, "tool_use"),
        toolUseId: block.id,
        toolName: block.name,
        input: block.input,
        inputPreview,
      });
    }
    i += 1;
  }

  const usage = raw.message.usage;
  if (usage && typeof usage.input_tokens === "number") {
    out.push({
      ...base,
      kind: "usage",
      id: makeId(sessionId, sourceUuid, i, "usage"),
      model,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    });
  }

  return out;
}

function normalizeSystem(raw: RawSystemLine): NormalizedEvent[] {
  const out: NormalizedEvent[] = [];
  const o = raw as unknown as Record<string, unknown>;
  const subtype = typeof o.subtype === "string" ? o.subtype : undefined;
  const hookName =
    typeof o.hookName === "string" ? o.hookName : undefined;
  const hookEvent =
    typeof o.hookEvent === "string" ? o.hookEvent : undefined;
  if (subtype === "hook" || hookName || hookEvent) {
    out.push({
      sessionId: raw.sessionId,
      agent: asAgent(raw.isSidechain),
      timestamp: pickTimestamp(raw),
      parentUuid: raw.parentUuid ?? null,
      sourceUuid: raw.uuid,
      cwd: raw.cwd,
      gitBranch: raw.gitBranch,
      kind: "hook",
      id: makeId(raw.sessionId, raw.uuid, 0, "hook"),
      hook: hookName ?? hookEvent ?? subtype ?? "system",
      payload: o,
    });
  }
  return out;
}

function normalizeMeta(
  raw: Record<string, unknown> & { sessionId: string; type: string },
): NormalizedEvent[] {
  const sessionId = raw.sessionId;
  const t = raw.type;
  const timestamp =
    typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString();
  const base = {
    sessionId,
    agent: "main" as const,
    timestamp,
    parentUuid: null,
    sourceUuid: typeof raw.uuid === "string" ? raw.uuid : undefined,
  };

  const disambig = base.sourceUuid ?? `${timestamp}:${hashString(JSON.stringify(raw))}`;

  if (t === "ai-title") {
    const title =
      typeof raw.title === "string"
        ? raw.title
        : typeof raw.aiTitle === "string"
          ? raw.aiTitle
          : undefined;
    if (!title) return [];
    return [
      {
        ...base,
        kind: "session_meta",
        id: makeId(sessionId, disambig, 0, "session_meta:title"),
        field: "title",
        value: title,
      },
    ];
  }

  if (t === "permission-mode") {
    const mode =
      typeof raw.permissionMode === "string" ? raw.permissionMode : undefined;
    if (!mode) return [];
    return [
      {
        ...base,
        kind: "session_meta",
        id: makeId(sessionId, disambig, 0, "session_meta:permission"),
        field: "permission-mode",
        value: mode,
      },
    ];
  }

  return [];
}

export function parseLine(rawLine: string): NormalizedEvent[] {
  const line = rawLine.replace(/^﻿/, "").trim();
  if (line.length === 0) return [];

  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch (err) {
    console.warn("[parser] JSON parse failed:", (err as Error).message);
    return [];
  }

  if (json === null || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;

  const t = obj.type;
  if (
    t === "last-prompt" ||
    t === "bridge-session" ||
    t === "queue-operation" ||
    t === "attachment" ||
    t === "file-history-snapshot" ||
    t === "custom-title" ||
    t === "agent-name" ||
    t === "ide" ||
    t === "user-id"
  ) {
    return [];
  }

  const parsed = RawLine.safeParse(json);
  if (!parsed.success) {
    logSchemaMismatch(typeof t === "string" ? t : "<unknown>", parsed.error.issues[0]?.message ?? "");
    return [];
  }

  const raw = parsed.data;
  switch (raw.type) {
    case "user":
      return normalizeUser(raw);
    case "assistant":
      return normalizeAssistant(raw);
    case "system":
      return normalizeSystem(raw);
    case "ai-title":
    case "permission-mode":
      return normalizeMeta(raw as unknown as Record<string, unknown> & { sessionId: string; type: string });
    default:
      return [];
  }
}

export function parseAndYield(rawLines: string[]): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  for (const line of rawLines) {
    const parsed = parseLine(line);
    for (const ev of parsed) events.push(ev);
  }
  return events;
}
