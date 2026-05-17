import { NextResponse } from "next/server";
import { ensureBooted } from "@/lib/events/boot";
import { eventStore } from "@/lib/events/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await ensureBooted();

  const { id } = await params;
  const summary = eventStore.getSession(id);

  if (!summary) {
    return NextResponse.json(
      { error: "session_not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const all = eventStore.getBySession(id);
  const events = all.length > limit ? all.slice(all.length - limit) : all;

  return NextResponse.json(
    { summary, events },
    { headers: { "Cache-Control": "no-store" } },
  );
}
