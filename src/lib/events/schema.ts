import { z } from "zod";

/* =========================================================================
 *  Raw transcript shapes (what Claude Code writes to JSONL)
 *  ------------------------------------------------------------------------
 *  These are intentionally permissive: Claude Code's transcript format
 *  evolves and we want to ingest unknown fields without failing.
 * ========================================================================= */

const UsageSchema = z
  .object({
    input_tokens: z.number().int().nonnegative().optional(),
    output_tokens: z.number().int().nonnegative().optional(),
    cache_creation_input_tokens: z.number().int().nonnegative().optional(),
    cache_read_input_tokens: z.number().int().nonnegative().optional(),
    service_tier: z.string().optional(),
  })
  .passthrough();

const TextBlock = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const ThinkingBlock = z.object({
  type: z.literal("thinking"),
  thinking: z.string().optional().default(""),
  signature: z.string().optional(),
});

const ToolUseBlock = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.unknown().optional(),
});

const ToolResultBlock = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.unknown().optional(),
  is_error: z.boolean().optional(),
});

const ContentBlock = z.discriminatedUnion("type", [
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResultBlock,
]);

const Base = z.object({
  sessionId: z.string(),
  uuid: z.string().optional(),
  parentUuid: z.string().nullable().optional(),
  timestamp: z.string().optional(),
  cwd: z.string().optional(),
  gitBranch: z.string().optional(),
  version: z.string().optional(),
  isSidechain: z.boolean().optional(),
  userType: z.string().optional(),
});

export const RawUserLine = Base.extend({
  type: z.literal("user"),
  message: z
    .object({
      role: z.literal("user"),
      content: z.union([z.string(), z.array(ContentBlock)]),
    })
    .passthrough(),
}).passthrough();

export const RawAssistantLine = Base.extend({
  type: z.literal("assistant"),
  message: z
    .object({
      role: z.literal("assistant"),
      id: z.string().optional(),
      model: z.string().optional(),
      content: z.array(ContentBlock),
      stop_reason: z.string().nullable().optional(),
      usage: UsageSchema.optional(),
    })
    .passthrough(),
  requestId: z.string().optional(),
}).passthrough();

export const RawSystemLine = Base.extend({
  type: z.literal("system"),
  content: z.string().optional(),
  level: z.string().optional(),
}).passthrough();

export const RawMetaLine = z
  .object({
    sessionId: z.string(),
    type: z.enum([
      "last-prompt",
      "permission-mode",
      "bridge-session",
      "ai-title",
      "queue-operation",
      "attachment",
      "file-history-snapshot",
    ]),
  })
  .passthrough();

export const RawLine = z.union([
  RawAssistantLine,
  RawUserLine,
  RawSystemLine,
  RawMetaLine,
]);

export type RawAssistantLine = z.infer<typeof RawAssistantLine>;
export type RawUserLine = z.infer<typeof RawUserLine>;
export type RawSystemLine = z.infer<typeof RawSystemLine>;
export type RawLine = z.infer<typeof RawLine>;

/* =========================================================================
 *  Normalized events (what we broadcast to the UI)
 *  ------------------------------------------------------------------------
 *  One normalized event per meaningful thing that happened. Each is tagged
 *  with a session + an agent (main or sidechain) so the UI can route it.
 * ========================================================================= */

export const AgentKind = z.enum(["main", "subagent"]);
export type AgentKind = z.infer<typeof AgentKind>;

const EventBase = z.object({
  id: z.string(),
  sessionId: z.string(),
  agent: AgentKind,
  timestamp: z.string(),
  parentUuid: z.string().nullable().optional(),
  sourceUuid: z.string().optional(),
  cwd: z.string().optional(),
  gitBranch: z.string().optional(),
});

export const UserMessageEvent = EventBase.extend({
  kind: z.literal("user_message"),
  text: z.string(),
});

export const AssistantTextEvent = EventBase.extend({
  kind: z.literal("assistant_text"),
  model: z.string().optional(),
  text: z.string(),
  stopReason: z.string().nullable().optional(),
});

export const AssistantThinkingEvent = EventBase.extend({
  kind: z.literal("assistant_thinking"),
  model: z.string().optional(),
  text: z.string(),
});

export const ToolUseEvent = EventBase.extend({
  kind: z.literal("tool_use"),
  toolUseId: z.string(),
  toolName: z.string(),
  input: z.unknown().optional(),
  inputPreview: z.string().optional(),
});

export const ToolResultEvent = EventBase.extend({
  kind: z.literal("tool_result"),
  toolUseId: z.string(),
  toolName: z.string().optional(),
  isError: z.boolean().optional(),
  output: z.unknown().optional(),
  outputPreview: z.string().optional(),
  durationMs: z.number().optional(),
});

export const UsageEvent = EventBase.extend({
  kind: z.literal("usage"),
  model: z.string().optional(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheCreationTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
});

export const SessionMetaEvent = EventBase.extend({
  kind: z.literal("session_meta"),
  field: z.enum(["title", "permission-mode", "version", "branch"]),
  value: z.string(),
});

export const HookEvent = EventBase.extend({
  kind: z.literal("hook"),
  hook: z.string(),
  payload: z.unknown().optional(),
});

export const NormalizedEvent = z.discriminatedUnion("kind", [
  UserMessageEvent,
  AssistantTextEvent,
  AssistantThinkingEvent,
  ToolUseEvent,
  ToolResultEvent,
  UsageEvent,
  SessionMetaEvent,
  HookEvent,
]);

export type NormalizedEvent = z.infer<typeof NormalizedEvent>;
export type UserMessageEvent = z.infer<typeof UserMessageEvent>;
export type AssistantTextEvent = z.infer<typeof AssistantTextEvent>;
export type AssistantThinkingEvent = z.infer<typeof AssistantThinkingEvent>;
export type ToolUseEvent = z.infer<typeof ToolUseEvent>;
export type ToolResultEvent = z.infer<typeof ToolResultEvent>;
export type UsageEvent = z.infer<typeof UsageEvent>;
export type SessionMetaEvent = z.infer<typeof SessionMetaEvent>;
export type HookEvent = z.infer<typeof HookEvent>;

/* =========================================================================
 *  Session summary
 * ========================================================================= */

export const SessionSummary = z.object({
  sessionId: z.string(),
  projectDir: z.string(),
  cwd: z.string().optional(),
  title: z.string().optional(),
  startedAt: z.string().optional(),
  lastActivityAt: z.string().optional(),
  branch: z.string().optional(),
  version: z.string().optional(),
  totalEvents: z.number().int().nonnegative(),
  toolCalls: z.number().int().nonnegative(),
  subagents: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheCreationTokens: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

export type SessionSummary = z.infer<typeof SessionSummary>;

/* =========================================================================
 *  Tool categorization (drives UI colors / icons)
 * ========================================================================= */

export const TOOL_CATEGORIES = {
  Read: "read",
  Edit: "edit",
  MultiEdit: "edit",
  Write: "write",
  NotebookEdit: "write",
  Bash: "bash",
  PowerShell: "bash",
  Grep: "grep",
  Glob: "glob",
  WebFetch: "web",
  WebSearch: "web",
  Agent: "agent",
  Task: "task",
  TaskCreate: "task",
  TaskList: "task",
  TaskUpdate: "task",
  TaskGet: "task",
  TaskOutput: "task",
  TaskStop: "task",
} as const;

export type ToolCategory =
  | "read"
  | "edit"
  | "write"
  | "bash"
  | "grep"
  | "glob"
  | "web"
  | "agent"
  | "task"
  | "other";

export function categorizeTool(name: string): ToolCategory {
  if (name in TOOL_CATEGORIES) {
    return TOOL_CATEGORIES[name as keyof typeof TOOL_CATEGORIES];
  }
  if (name.startsWith("mcp__")) return "other";
  if (name.startsWith("Task")) return "task";
  return "other";
}
