import { expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { limitHistoryStore } from "../history-cap.ts";

test("removes least recently used histories down to the limit, never one used today", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hcap-"));
  const now = Date.now(), day = 24 * 3600 * 1000;
  for (const [name, ageDays] of [["old", 30], ["mid", 10], ["today", 0]] as const) {
    fs.mkdirSync(path.join(root, name, "repo.git", "objects"), { recursive: true });
    const f = path.join(root, name, "repo.git", "objects", "pack");
    fs.writeFileSync(f, Buffer.alloc(1000));
    const t = new Date(now - ageDays * day); fs.utimesSync(f, t, t);
  }
  expect((await limitHistoryStore(root, 2500, now)).map((p) => path.basename(p))).toEqual(["old"]);
  expect((await limitHistoryStore(root, 10, now)).map((p) => path.basename(p))).toEqual(["mid"]);   // "today" stays even over the limit
  expect(fs.readdirSync(root)).toEqual(["today"]);
  expect(await limitHistoryStore(path.join(root, "missing"), 10, now)).toEqual([]);
  fs.rmSync(root, { recursive: true, force: true });
});
