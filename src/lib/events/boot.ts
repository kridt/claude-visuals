import { startWatcher } from "@/lib/events/watcher";

type WatcherHandle = { stop(): Promise<void> };

type GlobalWithWatcher = typeof globalThis & {
  __cvWatcher?: WatcherHandle | Promise<WatcherHandle>;
  __cvWatcherBooted?: boolean;
};

const g = globalThis as GlobalWithWatcher;

export async function ensureBooted(): Promise<void> {
  if (g.__cvWatcherBooted) return;
  if (g.__cvWatcher) {
    await g.__cvWatcher;
    return;
  }

  try {
    const pending = startWatcher();
    g.__cvWatcher = pending;
    const handle = await pending;
    g.__cvWatcher = handle;
    g.__cvWatcherBooted = true;
  } catch (err) {
    console.error("[boot] failed to start watcher:", err);
    delete g.__cvWatcher;
  }
}
