import { NextResponse } from "next/server";
import { ensureBooted } from "@/lib/events/boot";
import { eventStore } from "@/lib/events/store";
import type { SessionSummary } from "@/lib/events/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  await ensureBooted();

  const sessions = [...eventStore.getSessions()].sort((a, b) => {
    const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
    const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
    return bTime - aTime;
  });

  const active = sessions.reduce<number>(
    (acc, s: SessionSummary) => acc + (s.isActive ? 1 : 0),
    0,
  );

  return NextResponse.json(
    { sessions, active },
    { headers: { "Cache-Control": "no-store" } },
  );
}
