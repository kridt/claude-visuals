# claude-visuals

**Cinematic real-time visualizer for Claude Code.** See every agent, task, and tool call across all your Claude Code sessions, animated in real time, running on `localhost`.

> *screenshot coming soon*

```bash
npx claude-visuals
```

## What it shows

- Live tool calls across all your active Claude Code sessions
- Subagent activity (anything Claude spawns as a sidechain)
- Token usage (input / output / cache hits)
- Per-session timelines you can scrub through (coming in Phase 3)
- 3D agent galaxy (coming in Phase 2)

## Quick start

```bash
# one-shot, no install
npx claude-visuals

# or install globally
npm i -g claude-visuals
claude-visuals
```

It binds to `127.0.0.1` on a free port (default range 4310-4399), opens your browser automatically, and starts tailing transcripts at `~/.claude/projects/`.

### Options

```
claude-visuals [command] [options]

Commands
  (default)            launch the built app
  dev                  launch in dev mode (next dev)
  install-hooks        install Claude Code hooks for sub-second latency
  uninstall-hooks      remove claude-visuals hooks

Options
  -p, --port <n>       pin a port (default: free port in 4310-4399)
  -H, --host <h>       host to bind (default: 127.0.0.1)
      --no-open        don't open the browser automatically
      --dev            same as the "dev" command
  -h, --help           show this help
  -v, --version        print version
```

## Sub-second mode (optional)

Transcript-tail mode is ~1s. For sub-second latency, install hooks:

```bash
claude-visuals install-hooks
```

This adds `PreToolUse` / `PostToolUse` / `SubagentStop` / `Notification` / `Stop` / `SessionStart` hooks to `~/.claude/settings.json` that POST to your local claude-visuals server. A backup of your settings is created first.

Remove later with `claude-visuals uninstall-hooks`.

## How it works

```
Claude Code ──jsonl + hooks──▶ claude-visuals server ──SSE──▶ browser
                                       │
                                       └─▶ SQLite (history)
```

claude-visuals is local-first: no telemetry, all data stays on `127.0.0.1`.

## Development

```bash
pnpm install
pnpm dev
```

## Roadmap

- [x] Phase 1 — 2D Live Cockpit, transcript watcher, SSE stream
- [ ] Phase 2 — Three.js agent galaxy, sound design, themes
- [ ] Phase 3 — SQLite persistence, scrubbable session replay
- [ ] Phase 4 — Token heatmaps, cost dashboard, diff overlays
- [ ] Phase 5 — Vercel-hosted public demo with synthetic data

## License

MIT
