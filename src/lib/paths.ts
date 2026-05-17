import { homedir } from "node:os";
import { join } from "node:path";

export const HOME = homedir();
export const CLAUDE_DIR = join(HOME, ".claude");
export const CLAUDE_PROJECTS_DIR = join(CLAUDE_DIR, "projects");
export const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

export const CV_DATA_DIR = join(HOME, ".claude-visuals");
export const CV_DB_FILE = join(CV_DATA_DIR, "db.sqlite");
export const CV_CONSENT_FILE = join(CV_DATA_DIR, "consent.json");

/**
 * Claude Code encodes a project's cwd as the directory name by replacing
 * path separators and the drive colon with hyphens.
 *
 *   C:\Users\chrni\Desktop\claude visuals  ->  C--Users-chrni-Desktop-claude-visuals
 */
export function encodeProjectDir(cwd: string): string {
  return cwd.replace(/[\\\/:]/g, "-").replace(/\s+/g, "-");
}
