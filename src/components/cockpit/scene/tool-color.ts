import type { ToolCategory } from '@/lib/events/schema';

export const TOOL_COLOR: Record<ToolCategory, number> = {
  read: 0x6ab4ff,
  edit: 0x6ddf9c,
  write: 0x73e6c0,
  bash: 0xf2c270,
  grep: 0x7cd2ea,
  glob: 0x80b6ff,
  web: 0xb084f3,
  agent: 0xc875f5,
  task: 0xed7faa,
  other: 0x9aa3b8,
};

export const STATUS_COLOR = {
  idle: 0x7c4dff,
  thinking: 0xb084f3,
  running_tool: 0xc875f5,
  error: 0xe05a6b,
} as const;

export type SceneStatus = keyof typeof STATUS_COLOR;
