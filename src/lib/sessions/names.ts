import { formatRelativeTime } from "@/lib/utils";

interface InputLike {
  cwd?: string;
  projectDir?: string;
}

interface NameResult {
  name: string;
  parents: string[];
  fullPath: string;
}

// projectDir fallback splits on '-' which is ambiguous when real directory names
// contain hyphens (e.g. `desktop-tool` becomes two segments). We always prefer cwd.
export function friendlyProjectName(s: InputLike): NameResult {
  const cwd = s.cwd?.trim();
  if (cwd) {
    const segments = cwd
      .replace(/\\/g, "/")
      .split("/")
      .map((p) => p.replace(/^[A-Za-z]:$/, (m) => m.toUpperCase()))
      .filter((p) => p.length > 0);
    if (segments.length === 0) {
      return { name: cwd, parents: [], fullPath: cwd };
    }
    const name = segments[segments.length - 1] ?? cwd;
    const parents = segments.slice(0, -1);
    return { name, parents: trimParents(parents), fullPath: cwd };
  }

  const raw = s.projectDir?.trim() ?? "";
  if (!raw) return { name: "—", parents: [], fullPath: "" };

  let parts = raw.split("-").filter((p) => p.length > 0);
  if (parts.length >= 4 && /^[A-Za-z]$/.test(parts[0] ?? "")) {
    parts = parts.slice(1);
  }
  if (parts[0]?.toLowerCase() === "users" && parts.length >= 3) {
    parts = parts.slice(2);
  }
  if (parts[0]?.toLowerCase() === "desktop") {
    parts = parts.slice(1);
  }

  if (parts.length === 0) {
    return { name: raw, parents: [], fullPath: raw };
  }
  const name = parts[parts.length - 1] ?? raw;
  const parents = parts.slice(0, -1);
  return { name, parents: trimParents(parents), fullPath: raw };
}

function trimParents(parents: string[]): string[] {
  const cleaned = parents.filter((p) => p && p !== "/" && p !== "\\");
  if (cleaned.length <= 3) return cleaned;
  return cleaned.slice(cleaned.length - 3);
}

export function lastActivityRelative(s: { lastActivityAt?: string }): string {
  if (!s.lastActivityAt) return "—";
  return formatRelativeTime(s.lastActivityAt);
}
