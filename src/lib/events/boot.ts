import { startWatcher } from "@/lib/events/watcher";
import { eventStore } from "@/lib/events/store";

type WatcherHandle = { stop(): Promise<void> };

type GlobalWithWatcher = typeof globalThis & {
  __cvWatcher?: WatcherHandle | Promise<WatcherHandle>;
  __cvWatcherStore?: typeof eventStore;
};

const g = globalThis as GlobalWithWatcher;

export async function ensureBooted(): Promise<void> {
  if (g.__cvWatcher && g.__cvWatcherStore === eventStore) {
    if (typeof (g.__cvWatcher as PromiseLike<WatcherHandle>).then === "function") {
      await g.__cvWatcher;
    }
    return;
  }

  if (g.__cvWatcher && g.__cvWatcherStore !== eventStore) {
    try {
      const prev = await g.__cvWatcher;
      await prev.stop();
    } catch {}
    delete g.__cvWatcher;
  }

  try {
    const pending = startWatcher();
    g.__cvWatcher = pending;
    g.__cvWatcherStore = eventStore;
    const handle = await pending;
    g.__cvWatcher = handle;
  } catch (err) {
    console.error("[boot] failed to start watcher:", err);
    delete g.__cvWatcher;
    delete g.__cvWatcherStore;
  }
}

export function isWatching(): boolean {
  return g.__cvWatcher !== undefined && g.__cvWatcherStore === eventStore;
}
