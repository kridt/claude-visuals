import { NextResponse } from "next/server";
import { ensureBooted, isWatching } from "@/lib/events/boot";
import { eventStore } from "@/lib/events/store";
import pkg from "../../../../package.json" with { type: "json" };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  await ensureBooted();

  const sessions = eventStore.getSessions();
  const events = eventStore.getAll();
  const watching = isWatching();

  return NextResponse.json(
    {
      ok: true,
      version: pkg.version,
      watching,
      sessions: sessions.length,
      events: events.length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
