#!/usr/bin/env node
/**
 * claude-visuals CLI
 * ------------------------------------------------------------------
 * Single-binary launcher + hooks installer for the claude-visuals
 * cinematic mission control UI.
 *
 *   $ claude-visuals                  launch the built app
 *   $ claude-visuals dev              launch `next dev`
 *   $ claude-visuals --port 4000      pin a port
 *   $ claude-visuals --no-open        don't open browser
 *   $ claude-visuals install-hooks    add Claude Code hooks
 *   $ claude-visuals uninstall-hooks  remove our hooks
 *
 * Pure ESM. Uses only `get-port` and `open` from node_modules; the
 * rest is plain Node 20+ stdlib.
 * ------------------------------------------------------------------ */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

import getPort, { portNumbers } from "get-port";
import open from "open";

/* ─────────────────────────── paths & meta ──────────────────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolvePath(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

const IS_WIN = process.platform === "win32";
const NEXT_BIN = join(
  PKG_ROOT,
  "node_modules",
  ".bin",
  IS_WIN ? "next.cmd" : "next",
);
const STANDALONE_SERVER = join(PKG_ROOT, ".next", "standalone", "server.js");

const CLAUDE_DIR = join(homedir(), ".claude");
const CLAUDE_SETTINGS = join(CLAUDE_DIR, "settings.json");
const CV_DIR = join(homedir(), ".claude-visuals");
const CV_CONSENT = join(CV_DIR, "consent.json");

/* ───────────────────────────── ANSI ────────────────────────────────── */

const useColor = !process.env.NO_COLOR && process.stdout.isTTY !== false;

const c = useColor
  ? {
      reset: "\x1b[0m",
      dim: "\x1b[2m",
      bold: "\x1b[1m",
      purple: "\x1b[38;2;176;132;243m",
      cyan: "\x1b[38;2;124;230;234m",
      green: "\x1b[38;2;120;220;160m",
      red: "\x1b[38;2;240;120;120m",
      yellow: "\x1b[38;2;240;200;120m",
    }
  : Object.fromEntries(
      ["reset", "dim", "bold", "purple", "cyan", "green", "red", "yellow"].map(
        (k) => [k, ""],
      ),
    );

function paint(color, text) {
  return `${color}${text}${c.reset}`;
}

/* ─────────────────────────── arg parsing ───────────────────────────── */

function parseArgs(argv) {
  const out = {
    positional: [],
    port: null,
    host: "127.0.0.1",
    open: true,
    dev: false,
    help: false,
    version: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--port":
      case "-p": {
        const v = argv[++i];
        const n = Number.parseInt(v, 10);
        if (!Number.isFinite(n) || n < 1 || n > 65535) {
          fail(`invalid port: ${v}`);
        }
        out.port = n;
        break;
      }
      case "--host":
      case "-H":
        out.host = argv[++i] ?? "127.0.0.1";
        break;
      case "--no-open":
        out.open = false;
        break;
      case "--dev":
        out.dev = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      case "--version":
      case "-v":
        out.version = true;
        break;
      default:
        if (a.startsWith("--")) fail(`unknown flag: ${a}`);
        out.positional.push(a);
    }
  }
  return out;
}

/* ──────────────────────────── help text ────────────────────────────── */

function printHelp() {
  const head =
    paint(c.purple, "⬢  claude-visuals ") +
    paint(c.dim, `v${pkg.version}`) +
    "\n" +
    paint(c.dim, "   cinematic mission control for Claude Code") +
    "\n";

  const body = `
${paint(c.bold, "Usage")}
  ${paint(c.cyan, "claude-visuals")} ${paint(c.dim, "[command] [options]")}

${paint(c.bold, "Commands")}
  ${paint(c.cyan, "(default)")}            launch the built app
  ${paint(c.cyan, "dev")}                  launch in dev mode (next dev)
  ${paint(c.cyan, "install-hooks")}        install Claude Code hooks for sub-second latency
  ${paint(c.cyan, "uninstall-hooks")}      remove claude-visuals hooks

${paint(c.bold, "Options")}
  ${paint(c.cyan, "-p, --port <n>")}       pin a port (default: free port in 4310-4399)
  ${paint(c.cyan, "-H, --host <h>")}       host to bind (default: 127.0.0.1)
  ${paint(c.cyan, "    --no-open")}        don't open the browser automatically
  ${paint(c.cyan, "    --dev")}            same as the "dev" command
  ${paint(c.cyan, "-h, --help")}           show this help
  ${paint(c.cyan, "-v, --version")}        print version

${paint(c.bold, "Examples")}
  ${paint(c.dim, "$")} claude-visuals
  ${paint(c.dim, "$")} claude-visuals dev --port 4000
  ${paint(c.dim, "$")} claude-visuals install-hooks --port 4310
`;
  process.stdout.write(head + body + "\n");
}

/* ─────────────────────────── error helpers ─────────────────────────── */

function fail(msg, code = 1) {
  process.stderr.write(paint(c.red, "✖ ") + msg + "\n");
  process.exit(code);
}

function info(msg) {
  process.stdout.write(paint(c.dim, "│ ") + msg + "\n");
}

function success(msg) {
  process.stdout.write(paint(c.green, "✓ ") + msg + "\n");
}

/* ────────────────────────────── banner ─────────────────────────────── */

function banner({ url, mode, hooks }) {
  const lines = [
    `${paint(c.purple, "⬢")}  ${paint(c.bold, "claude-visuals")} ${paint(c.dim, `v${pkg.version}`)}`,
    paint(c.dim, "cinematic mission control for Claude Code"),
    "",
    `${paint(c.dim, "▸ Local:")}  ${paint(c.cyan, url)}`,
    `${paint(c.dim, "▸ Mode:")}   ${paint(c.purple, mode)}`,
    `${paint(c.dim, "▸ Hooks:")}  ${hooks ? paint(c.green, "installed") : paint(c.dim, "not installed")}`,
    "",
    paint(c.dim, "Press Ctrl+C to quit"),
  ];

  // Calculate visible widths (strip ANSI for measurement).
  const ansi = /\x1b\[[0-9;]*m/g;
  const visibleWidth = (s) => s.replace(ansi, "").length;
  const inner = Math.max(...lines.map(visibleWidth), 46);
  const pad = (s) => s + " ".repeat(inner - visibleWidth(s));

  const top = paint(c.purple, "╭" + "─".repeat(inner + 4) + "╮");
  const bot = paint(c.purple, "╰" + "─".repeat(inner + 4) + "╯");
  const side = paint(c.purple, "│");

  const out = [
    "",
    top,
    ...lines.map((l) => `${side}  ${pad(l)}  ${side}`),
    bot,
    "",
  ].join("\n");
  process.stdout.write(out);
}

/* ──────────────────────────── port logic ───────────────────────────── */

async function pickPort(requested) {
  if (requested) {
    // Trust the user but still verify it's free; if not, fail clearly.
    try {
      const got = await getPort({ port: requested });
      if (got !== requested) {
        fail(
          `port ${requested} is in use (would have used ${got}). Try a different --port.`,
        );
      }
      return got;
    } catch (err) {
      fail(`unable to bind port ${requested}: ${err.message}`);
    }
  }
  return getPort({ port: portNumbers(4310, 4399) });
}

/* ───────────────────────── consent / hook state ────────────────────── */

function readConsent() {
  try {
    return JSON.parse(readFileSync(CV_CONSENT, "utf8"));
  } catch {
    return null;
  }
}

function writeConsent(data) {
  if (!existsSync(CV_DIR)) mkdirSync(CV_DIR, { recursive: true });
  writeFileSync(CV_CONSENT, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/* ─────────────────────────── server launch ─────────────────────────── */

async function waitForHealth(host, port, timeoutMs = 30_000) {
  const url = `http://${host}:${port}/api/health`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      // ignore - server not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function pipeChild(child) {
  const prefix = paint(c.dim, "│ ");
  const stream = (src) => {
    let buf = "";
    src.setEncoding("utf8");
    src.on("data", (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        process.stdout.write(prefix + line + "\n");
      }
    });
    src.on("end", () => {
      if (buf.length) process.stdout.write(prefix + buf + "\n");
    });
  };
  if (child.stdout) stream(child.stdout);
  if (child.stderr) stream(child.stderr);
}

function spawnServer({ mode, host, port }) {
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: host,
    NODE_ENV: mode === "dev" ? "development" : "production",
  };

  if (mode === "production" && existsSync(STANDALONE_SERVER)) {
    info(`starting standalone server (${paint(c.cyan, host + ":" + port)})`);
    return spawn(process.execPath, [STANDALONE_SERVER], {
      cwd: PKG_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
  }

  if (!existsSync(NEXT_BIN)) {
    fail(
      `couldn't find next CLI at ${NEXT_BIN}. Is claude-visuals installed correctly?`,
    );
  }

  if (mode === "production") {
    info(`starting next start (${paint(c.cyan, host + ":" + port)})`);
    info(
      paint(
        c.yellow,
        "tip: production builds are faster — run `pnpm build` first.",
      ),
    );
    return spawn(NEXT_BIN, ["start", "-H", host, "-p", String(port)], {
      cwd: PKG_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
  }

  // dev mode
  info(`starting next dev (${paint(c.cyan, host + ":" + port)})`);
  return spawn(NEXT_BIN, ["dev", "-H", host, "-p", String(port)], {
    cwd: PKG_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
  });
}

async function cmdLaunch(args) {
  const mode = args.dev || args.positional[0] === "dev" ? "dev" : "production";

  if (mode === "production" && !existsSync(STANDALONE_SERVER)) {
    // Allow `next start` fallback only if .next exists at all.
    const builtAtAll = existsSync(join(PKG_ROOT, ".next"));
    if (!builtAtAll) {
      fail(
        "claude-visuals isn't built. Run `pnpm build` first, or use `claude-visuals dev`.",
      );
    }
  }

  const port = await pickPort(args.port);
  const url = `http://${args.host}:${port}`;
  const consent = readConsent();
  const hooksInstalled = !!consent?.hooksInstalledAt;

  banner({ url, mode, hooks: hooksInstalled });

  const child = spawnServer({ mode, host: args.host, port });
  pipeChild(child);

  let exited = false;
  child.on("exit", (code, signal) => {
    exited = true;
    if (signal) {
      process.exit(0);
    } else {
      process.exit(code ?? 0);
    }
  });
  child.on("error", (err) => {
    fail(`server failed to start: ${err.message}`);
  });

  const forward = (sig) => () => {
    if (!exited) child.kill(sig);
  };
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));

  // Wait for /api/health, then open browser.
  const healthy = await waitForHealth(args.host, port);
  if (!healthy) {
    info(paint(c.yellow, "server didn't become healthy in 30s — still trying"));
  } else {
    success(`ready at ${paint(c.cyan, url)}`);
    if (args.open) {
      try {
        await open(url);
      } catch {
        // ignore — user can click the link
      }
    }
  }
}

/* ─────────────────────────── hooks subcommand ──────────────────────── */

const HOOK_NAMES = [
  "PreToolUse",
  "PostToolUse",
  "SubagentStop",
  "Notification",
  "Stop",
  "SessionStart",
];

const CV_HOOK_TAG = "claude-visuals-hook";

function buildHookCommand(port, hookName) {
  // Single-line node -e command. We base64 the script to avoid quoting hell
  // across Windows cmd / PowerShell / POSIX shells.
  const script = `fetch('http://127.0.0.1:${port}/api/hook?event=${hookName}&__tag=${CV_HOOK_TAG}',{method:'POST',headers:{'content-type':'application/json'},body:process.env.CLAUDE_HOOK_PAYLOAD||''}).catch(()=>{})`;
  const b64 = Buffer.from(script, "utf8").toString("base64");
  return `node -e "eval(Buffer.from('${b64}','base64').toString('utf8'))"`;
}

function buildHooksObject(port) {
  const out = {};
  for (const name of HOOK_NAMES) {
    out[name] = [
      {
        hooks: [
          {
            type: "command",
            command: buildHookCommand(port, name),
          },
        ],
      },
    ];
  }
  return out;
}

function readSettings() {
  if (!existsSync(CLAUDE_SETTINGS)) return {};
  try {
    return JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8"));
  } catch (err) {
    fail(`couldn't parse ${CLAUDE_SETTINGS}: ${err.message}`);
  }
}

function backupSettings() {
  if (!existsSync(CLAUDE_SETTINGS)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `${CLAUDE_SETTINGS}.cv-backup-${stamp}`;
  writeFileSync(backup, readFileSync(CLAUDE_SETTINGS, "utf8"));
  return backup;
}

function writeSettings(data) {
  if (!existsSync(CLAUDE_DIR)) mkdirSync(CLAUDE_DIR, { recursive: true });
  writeFileSync(CLAUDE_SETTINGS, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function isCvHook(entry) {
  if (!entry || typeof entry !== "object") return false;
  const hooks = Array.isArray(entry.hooks) ? entry.hooks : [];
  return hooks.some(
    (h) =>
      h &&
      typeof h.command === "string" &&
      (h.command.includes(CV_HOOK_TAG) ||
        h.command.includes("claude-visuals") ||
        h.command.includes("/api/hook")),
  );
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function cmdInstallHooks(args) {
  const port = args.port ?? 4310;
  const settings = readSettings();
  const existingHooks =
    settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {};
  const newHooks = buildHooksObject(port);

  // Merge: keep any existing non-cv hook entries, but replace cv ones.
  const merged = { ...existingHooks };
  for (const name of HOOK_NAMES) {
    const existingForName = Array.isArray(existingHooks[name])
      ? existingHooks[name].filter((e) => !isCvHook(e))
      : [];
    merged[name] = [...existingForName, ...newHooks[name]];
  }

  process.stdout.write(
    "\n" +
      paint(c.bold, "About to write to ") +
      paint(c.cyan, CLAUDE_SETTINGS) +
      ":\n\n",
  );

  for (const name of HOOK_NAMES) {
    process.stdout.write(`  ${paint(c.purple, name)}\n`);
    process.stdout.write(
      `    ${paint(c.dim, "+ POST → http://127.0.0.1:" + port + "/api/hook?event=" + name)}\n`,
    );
  }

  process.stdout.write(
    "\n" +
      paint(c.dim, "Existing settings will be backed up to ") +
      paint(c.cyan, "~/.claude/settings.json.cv-backup-<timestamp>") +
      ".\n\n",
  );

  const answer = await prompt(
    paint(c.bold, "Apply these changes to ~/.claude/settings.json? [y/N] "),
  );
  if (answer !== "y" && answer !== "yes") {
    info("aborted — no changes made.");
    process.exit(0);
  }

  const backup = backupSettings();
  writeSettings({ ...settings, hooks: merged });

  if (backup) success(`backed up previous settings to ${paint(c.cyan, backup)}`);
  success(`hooks installed (port ${paint(c.cyan, port)})`);
  writeConsent({
    hooksInstalledAt: new Date().toISOString(),
    port,
  });
  process.stdout.write(
    "\n" +
      paint(c.dim, "To remove later: ") +
      paint(c.cyan, "claude-visuals uninstall-hooks") +
      "\n",
  );
}

async function cmdUninstallHooks() {
  const settings = readSettings();
  if (!settings.hooks || typeof settings.hooks !== "object") {
    info("no hooks found in ~/.claude/settings.json — nothing to do.");
    return;
  }

  const hooks = { ...settings.hooks };
  let removed = 0;
  for (const name of Object.keys(hooks)) {
    if (!Array.isArray(hooks[name])) continue;
    const before = hooks[name].length;
    hooks[name] = hooks[name].filter((entry) => {
      const drop = isCvHook(entry);
      if (drop) removed++;
      return !drop;
    });
    if (hooks[name].length === 0) delete hooks[name];
    void before;
  }

  if (removed === 0) {
    info("no claude-visuals hooks found — nothing to remove.");
    return;
  }

  const backup = backupSettings();
  const next = { ...settings, hooks };
  if (Object.keys(next.hooks).length === 0) delete next.hooks;
  writeSettings(next);

  if (backup) success(`backed up previous settings to ${paint(c.cyan, backup)}`);
  success(`removed ${removed} claude-visuals hook${removed === 1 ? "" : "s"}`);

  // Update consent
  const consent = readConsent();
  if (consent) {
    writeConsent({
      ...consent,
      hooksInstalledAt: null,
      hooksRemovedAt: new Date().toISOString(),
    });
  }
}

/* ─────────────────────────────── main ──────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }
  if (args.version) {
    process.stdout.write(pkg.version + "\n");
    return;
  }

  const cmd = args.positional[0];

  switch (cmd) {
    case "install-hooks":
      await cmdInstallHooks(args);
      return;
    case "uninstall-hooks":
      await cmdUninstallHooks();
      return;
    case "dev":
    case undefined:
      await cmdLaunch(args);
      return;
    default:
      fail(
        `unknown command: ${cmd}\n   try \`claude-visuals --help\` for usage.`,
      );
  }
}

main().catch((err) => {
  fail(err?.stack || err?.message || String(err));
});
