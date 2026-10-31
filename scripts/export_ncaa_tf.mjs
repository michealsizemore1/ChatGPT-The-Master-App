#!/usr/bin/env node
// Export the NCAA Track & Field page's data to data/ncaa-tf.json for the
// Track & Field Android widget. The page (ncaa-track-field.html) stays the
// single source of truth: this reads its STAND_MEN, STAND_WOMEN,
// PERFORMANCES and PATTERN arrays, so editing the page updates the widget.
// Run by .github/workflows/export-ncaa-tf.yml whenever the page changes.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "ncaa-track-field.html"), "utf8");

/** Pull `const NAME=[ ... ];` out of the page and evaluate the array literal. */
function grab(name) {
  const start = html.indexOf(`const ${name}=`);
  if (start < 0) throw new Error(`${name} not found in ncaa-track-field.html`);
  const open = html.indexOf("[", start);
  let depth = 0, i = open, quote = null;
  for (; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") quote = c;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) break;
  }
  return new Function(`return ${html.slice(open, i + 1)}`)();
}

const standings = (rows) => rows.map(([rank, team, points, flag]) => ({ rank, team, points, ...(flag ? { flag } : {}) }));

// Confirmed 2027 championship dates (from the page's Calendar tab) so the
// widget can count down; PATTERN's other entries are approximate months.
const NEXT = [
  { name: "NCAA Indoor Championships", start: "2027-03-12", end: "2027-03-13", where: "Fayetteville, AR (host: Arkansas)" },
  { name: "NCAA Outdoor Championships", start: "2027-06-09", end: "2027-06-12", where: "Eugene, OR (Hayward Field)" },
];

/**
 * Every event winner comes from data/ncaa-tf-champions-2026.json (the page only
 * lists standout runners from top-10 teams). Notes from the page's PERFORMANCES
 * (collegiate records, relay legs, etc.) are merged in where the json has none.
 */
function champions() {
  const list = JSON.parse(readFileSync(resolve(root, "data", "ncaa-tf-champions-2026.json"), "utf8")).champions;
  const pageEvent = (p) =>
    p.event.startsWith("Hurdles") ? (p.gender === "men" ? "110m Hurdles" : "100m Hurdles") : p.event;
  const pageNotes = new Map(
    grab("PERFORMANCES")
      .filter((p) => p.place === 1 && p.note)
      .map((p) => [`${p.gender}|${pageEvent(p)}`, p.note.replace(/^1[01]0m hurdles,?\s*/i, "")]),
  );
  return list.map((c) => {
    const note = c.note || pageNotes.get(`${c.gender}|${c.event}`) || "";
    return { ...c, ...(note ? { note } : {}) };
  });
}

const out = {
  season: "2026 NCAA Division I Outdoor Championships",
  page: "https://michealsizemore1.github.io/ChatGPT-The-Master-App/ncaa-track-field.html",
  standings: { men: standings(grab("STAND_MEN")), women: standings(grab("STAND_WOMEN")) },
  champions: champions(),
  championships: NEXT,
  calendar: grab("PATTERN").map(({ d, name, where }) => ({ when: `${d} 2027`, name, where })),
};

const target = resolve(root, "data", "ncaa-tf.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Exported ${out.standings.men.length}+${out.standings.women.length} standings, ${out.champions.length} champions.`);
