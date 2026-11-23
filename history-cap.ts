// history-cap.ts: keeps the undo history of pi-workspace-history under a size limit. That package
// keeps one copy of each project plus every version of the files the agent changed, with no size
// limit. Once per pi start, in the background: whole project histories are deleted, least recently
// used first, never one used in the last day (another pi may have it open).
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const MAX_BYTES = 5 * 1024 ** 3;
const DAY_MS = 24 * 3600 * 1000;

async function measure(dir: string): Promise<{ bytes: number; last: number }> {
  let bytes = 0, last = 0;
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (!e.isFile()) continue;
    const s = await fs.lstat(path.join((e as any).parentPath ?? (e as any).path, e.name)).catch(() => null);
    if (s) { bytes += s.size; last = Math.max(last, s.mtimeMs); }
  }
  if (!last) last = (await fs.stat(dir).catch(() => null))?.mtimeMs ?? 0;
  return { bytes, last };
}

// Returns the histories it removed.
export async function limitHistoryStore(root: string, maxBytes = MAX_BYTES, now = Date.now()): Promise<string[]> {
  const names = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const all = [];
  for (const d of names) if (d.isDirectory()) all.push({ dir: path.join(root, d.name), ...(await measure(path.join(root, d.name))) });
  let total = all.reduce((n, w) => n + w.bytes, 0);
  const removed: string[] = [];
  for (const w of all.sort((a, b) => a.last - b.last)) {
    if (total <= maxBytes) break;
    if (now - w.last < DAY_MS) continue;
    try { await fs.rm(w.dir, { recursive: true, force: true }); total -= w.bytes; removed.push(w.dir); } catch { }
  }
  return removed;
}

export default function (pi: ExtensionAPI) {
  let done = false;
  pi.on("session_start", async () => {
    if (done) return;
    done = true;
    const agentDir = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
    const root = path.join(agentDir, "state", "workspace-history", "workspaces");
    setTimeout(() => { limitHistoryStore(root).catch(() => { }); }, 20_000).unref();
  });
}
