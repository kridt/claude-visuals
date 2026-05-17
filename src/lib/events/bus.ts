import type { NormalizedEvent } from "@/lib/events/schema";

type Handler = (event: NormalizedEvent) => void;

const handlers = new Set<Handler>();

export const eventBus = {
  publish(event: NormalizedEvent): void {
    for (const h of handlers) {
      try {
        h(event);
      } catch (err) {
        console.error("[bus] subscriber threw:", err);
      }
    }
  },
  subscribe(handler: Handler): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  },
  subscribers(): number {
    return handlers.size;
  },
};
