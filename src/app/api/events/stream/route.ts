import { ensureBooted } from "@/lib/events/boot";
import { eventBus } from "@/lib/events/bus";
import { eventStore } from "@/lib/events/store";
import type { NormalizedEvent } from "@/lib/events/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLAY_COUNT = 200;
const PING_INTERVAL_MS = 15_000;

export async function GET(request: Request): Promise<Response> {
  await ensureBooted();

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string): void => {
        if (closed || request.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const formatEvent = (event: NormalizedEvent): string =>
        `data: ${JSON.stringify(event)}\n\n`;

      send(
        `event: hello\ndata: ${JSON.stringify({
          subscribers: eventBus.subscribers(),
        })}\n\n`,
      );

      const initial = sessionId
        ? eventStore.getBySession(sessionId)
        : eventStore.getAll();
      const replay =
        initial.length > REPLAY_COUNT
          ? initial.slice(initial.length - REPLAY_COUNT)
          : initial;
      for (const event of replay) {
        send(formatEvent(event));
      }

      const unsubscribe = eventBus.subscribe((event) => {
        if (sessionId && event.sessionId !== sessionId) return;
        send(formatEvent(event));
      });

      const pingTimer = setInterval(() => {
        send(`: ping\n\n`);
      }, PING_INTERVAL_MS);

      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(pingTimer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      if (request.signal.aborted) {
        cleanup();
        return;
      }

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
