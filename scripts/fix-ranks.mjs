// One-time repair: re-rank all tickets with non-base36 rank chars.
// Groups tickets by (project_id, status), preserves relative order, assigns
// evenly-spaced 6-digit base-36 ranks so future midpoints have room.

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "app.db");

const BASE = 36;
const WIDTH = 6; // 36^6 ≈ 2.1B — enough room for insertions

function isClean(rank) {
  for (const ch of rank) {
    const c = ch.charCodeAt(0);
    if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 122))) return false;
  }
  return true;
}

function intToRank(n) {
  let result = "";
  for (let i = 0; i < WIDTH; i++) {
    const digit = n % BASE;
    result = (digit < 10
      ? String.fromCharCode(48 + digit)
      : String.fromCharCode(97 + digit - 10)) + result;
    n = Math.floor(n / BASE);
  }
  return result;
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const tickets = db
  .prepare("SELECT id, project_id, status, rank FROM tickets ORDER BY project_id, status, rank")
  .all();

// Group by project+status
const groups = new Map();
for (const t of tickets) {
  const key = `${t.project_id}|${t.status}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(t);
}

const update = db.prepare("UPDATE tickets SET rank = ? WHERE id = ?");

let fixed = 0;
db.transaction(() => {
  for (const group of groups.values()) {
    if (group.every((t) => isClean(t.rank))) continue; // skip fully-clean groups

    const n = group.length;
    const step = Math.floor(Math.pow(BASE, WIDTH) / (n + 1));

    for (let i = 0; i < n; i++) {
      const newRank = intToRank(step * (i + 1));
      update.run(newRank, group[i].id);
      fixed++;
    }
  }
})();

console.log(`Fixed ${fixed} / ${tickets.length} ticket ranks.`);
db.close();
