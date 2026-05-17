import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { eventBus } from "@/lib/events/bus";
import { eventStore } from "@/lib/events/store";
import { ensureBooted } from "@/lib/events/boot";
import type { HookEvent } from "@/lib/events/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/hook?event=<HookName>
 *
 * Receives Claude Code hook events from `~/.claude/settings.json`.
 * The CLI installs hooks that POST the (optional) payload here so the
 * UI can react in well under a second — much faster than tailing the
 * JSONL transcript.
 *
 * Body: optional JSON payload as written by Claude Code into
 *       $CLAUDE_HOOK_PAYLOAD. We accept any shape.
 */
export async function POST(req: Request): Promise<NextResponse> {
  // Don't block on this — boot is idempotent and lazy.
  void ensureBooted();

  const url = new URL(req.url);
  const eventName = (url.searchParams.get("event") ?? "Unknown").slice(0, 64);

  let payload: unknown = undefined;
  try {
    const raw = await req.text();
    if (raw && raw.trim().length > 0) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { raw };
      }
    }
  } catch {
    // ignore — payload stays undefined
  }

  const sessionId =
    extractSessionId(payload) ?? extractFromQuery(url) ?? "unknown";

  const event: HookEvent = {
    kind: "hook",
    id: `hook:${randomUUID()}`,
    sessionId,
    agent: "main",
    timestamp: new Date().toISOString(),
    hook: eventName,
    payload,
  };

  try {
    eventStore.add(event);
    eventBus.publish(event);
  } catch (err) {
    // Never let a hook take down the route.
    console.error("[hook] failed to dispatch:", err);
  }

  return NextResponse.json(
    { ok: true, id: event.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: true, hint: "POST hook events here." },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function extractSessionId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const candidates = [
    p["session_id"],
    p["sessionId"],
    (p["session"] as Record<string, unknown> | undefined)?.["id"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

function extractFromQuery(url: URL): string | null {
  const s = url.searchParams.get("session_id") ?? url.searchParams.get("sessionId");
  return s && s.length > 0 ? s : null;
}
