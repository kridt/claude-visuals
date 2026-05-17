import { existsSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename } from "node:path";
import { platform } from "node:os";
import chokidar, { type FSWatcher } from "chokidar";

import { CLAUDE_PROJECTS_DIR } from "@/lib/paths";
import { eventBus } from "@/lib/events/bus";
import { eventStore } from "@/lib/events/store";
import { parseLine } from "@/lib/events/parser";
import type { NormalizedEvent } from "@/lib/events/schema";

type FileState = {
  offset: number;
  partial: string;
  sessionId: string;
};

type InactivityTimer = ReturnType<typeof setTimeout>;

const INACTIVITY_MS = 60_000;
const READ_CHUNK = 1 << 20;

function sessionIdFromPath(filepath: string): string {
  const name = basename(filepath);
  return name.endsWith(".jsonl") ? name.slice(0, -".jsonl".length) : name;
}

export function startWatcher(opts?: {
  onEvent?: (event: NormalizedEvent) => void;
}): Promise<{ stop(): Promise<void> }> {
  const fileStates = new Map<string, FileState>();
  const inactivityTimers = new Map<string, InactivityTimer>();
  let watcher: FSWatcher | undefined;
  let stopped = false;

  const onEvent = opts?.onEvent;

  function emit(event: NormalizedEvent): void {
    eventStore.add(event);
    eventBus.publish(event);
    if (onEvent) {
      try {
        onEvent(event);
      } catch (err) {
        console.error("[watcher] onEvent threw:", err);
      }
    }
  }

  function bumpActivity(sessionId: string): void {
    eventStore.markSessionActive(sessionId, true);
    const existing = inactivityTimers.get(sessionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      eventStore.markSessionActive(sessionId, false);
      inactivityTimers.delete(sessionId);
    }, INACTIVITY_MS);
    inactivityTimers.set(sessionId, t);
  }

  function consumeLines(state: FileState, chunk: string, markActive: boolean = true): void {
    const combined = state.partial + chunk;
    const lines = combined.split(/\r?\n/);
    const tail = lines.pop();
    state.partial = tail ?? "";
    for (const line of lines) {
      if (line.length === 0) continue;
      const events = parseLine(line);
      for (const ev of events) emit(ev);
    }
    if (markActive && lines.length > 0) bumpActivity(state.sessionId);
  }

  async function readFrom(filepath: string, from: number): Promise<{ bytesRead: number; text: string }> {
    let fh;
    try {
      fh = await open(filepath, "r");
    } catch (err) {
      console.warn("[watcher] open failed:", filepath, (err as Error).message);
      return { bytesRead: 0, text: "" };
    }
    try {
      const st = await fh.stat();
      if (st.size <= from) return { bytesRead: 0, text: "" };
      const length = st.size - from;
      let collected = "";
      let pos = from;
      const buf = Buffer.allocUnsafe(Math.min(length, READ_CHUNK));
      while (pos < st.size) {
        const toRead = Math.min(buf.length, st.size - pos);
        const r = await fh.read(buf, 0, toRead, pos);
        if (r.bytesRead === 0) break;
        collected += buf.slice(0, r.bytesRead).toString("utf8");
        pos += r.bytesRead;
      }
      return { bytesRead: pos - from, text: collected };
    } finally {
      await fh.close().catch(() => undefined);
    }
  }

  async function handleAddOrInitial(filepath: string): Promise<void> {
    if (!filepath.endsWith(".jsonl")) return;
    const sessionId = sessionIdFromPath(filepath);
    let state = fileStates.get(filepath);
    const isInitial = !state;
    if (!state) {
      state = { offset: 0, partial: "", sessionId };
      fileStates.set(filepath, state);
    }
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(filepath)).mtimeMs;
    } catch {}
    const { bytesRead, text } = await readFrom(filepath, state.offset);
    if (bytesRead === 0) return;
    state.offset += bytesRead;
    const recent = Date.now() - mtimeMs < INACTIVITY_MS;
    consumeLines(state, text, isInitial && !recent ? false : true);
  }

  async function handleChange(filepath: string): Promise<void> {
    if (!filepath.endsWith(".jsonl")) return;
    const sessionId = sessionIdFromPath(filepath);
    let state = fileStates.get(filepath);
    if (!state) {
      state = { offset: 0, partial: "", sessionId };
      fileStates.set(filepath, state);
    }
    let size = 0;
    try {
      size = (await stat(filepath)).size;
    } catch {
      return;
    }
    if (size < state.offset) {
      state.offset = 0;
      state.partial = "";
    }
    const { bytesRead, text } = await readFrom(filepath, state.offset);
    if (bytesRead === 0) return;
    state.offset += bytesRead;
    consumeLines(state, text);
  }

  function handleUnlink(filepath: string): void {
    fileStates.delete(filepath);
  }

  return (async () => {
    if (!existsSync(CLAUDE_PROJECTS_DIR)) {
      console.warn(
        "[watcher] CLAUDE_PROJECTS_DIR does not exist yet:",
        CLAUDE_PROJECTS_DIR,
      );
    }

    watcher = chokidar.watch(CLAUDE_PROJECTS_DIR, {
      ignoreInitial: false,
      persistent: true,
      usePolling: platform() === "win32",
      interval: 1500,
      binaryInterval: 3000,
      depth: 2,
      ignored: (p) => {
        const base = basename(p);
        if (base.startsWith(".")) return true;
        if (base === "node_modules") return true;
        if (base === "memory") return true;
        return false;
      },
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    watcher.on("add", (p) => {
      void handleAddOrInitial(p);
    });
    watcher.on("change", (p) => {
      void handleChange(p);
    });
    watcher.on("unlink", (p) => {
      handleUnlink(p);
    });
    watcher.on("error", (err) => {
      console.error("[watcher] error:", err);
    });

    return {
      async stop() {
        if (stopped) return;
        stopped = true;
        for (const t of inactivityTimers.values()) clearTimeout(t);
        inactivityTimers.clear();
        if (watcher) {
          await watcher.close().catch(() => undefined);
        }
      },
    };
  })();
}
