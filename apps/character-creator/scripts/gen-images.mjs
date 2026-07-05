// Generates PNG art for faction floor plans and NPC portraits.
// Floor plans are drawn as blueprint schematics from the room data in the
// floor-plan notes; NPC portraits are themed "portrait tokens". Both are
// authored as SVG and rasterised to PNG with @resvg/resvg-js.
//
// Run: node scripts/gen-images.mjs
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const appRoot = process.cwd();
const vaultRoot = path.resolve(appRoot, "../../Aethergate");

// ── Faction themes ────────────────────────────────────────────────────────────
const THEMES = {
  "Guild of Conduits": { bg1: "#3a2613", bg2: "#171008", accent: "#c8893f", light: "#f3dcb8", tag: "Guild of Conduits" },
  "Mana Authority":    { bg1: "#262b33", bg2: "#0e1116", accent: "#8aa0bf", light: "#dde6f2", tag: "Mana Authority" },
  "Ratio Office":      { bg1: "#173230", bg2: "#0a1716", accent: "#3fae9f", light: "#cdeee7", tag: "Ratio Office" },
  "White Line Wardens":{ bg1: "#2a2f36", bg2: "#121519", accent: "#d06a5b", light: "#f0e7e3", tag: "White Line Wardens" },
};

const NPCS = [
  { name: "Inspector Elara Voss", faction: "Mana Authority", role: "Investigator", ancestry: "half-elf", dir: "05 NPCs/Aethergate" },
  { name: "Mira Stoppcock", faction: "Guild of Conduits", role: "Guild Master of Pressure", ancestry: "dwarf" },
  { name: "Tobiah Flume", faction: "Guild of Conduits", role: "Apprentice Leak-Listener", ancestry: "human" },
  { name: "Granida Ostvik", faction: "Guild of Conduits", role: "Valve-Reader", ancestry: "gnome" },
  { name: "Castellan Aurex Vane", faction: "Mana Authority", role: "Authority Director", ancestry: "high man" },
  { name: "Odeth Brassgauge", faction: "Mana Authority", role: "Canister Inspector", ancestry: "gnome" },
  { name: "Wren Calloway", faction: "Mana Authority", role: "License Clerk", ancestry: "half-elf" },
  { name: "Chief Rationer Sabel Quint", faction: "Ratio Office", role: "Chief Rationer", ancestry: "human" },
  { name: "Clerk Hollin Marsh", faction: "Ratio Office", role: "Reserve Clerk", ancestry: "human" },
  { name: "Forecaster Imeya Dun", faction: "Ratio Office", role: "Decay Forecaster", ancestry: "half-elf" },
  { name: "Warden-Commander Halvard Crane", faction: "White Line Wardens", role: "Warden-Commander", ancestry: "high man" },
  { name: "Mercy-Warden Ilse Tarn", faction: "White Line Wardens", role: "Hospital-Line Warden", ancestry: "common man" },
  { name: "Corporal Dax Vey", faction: "White Line Wardens", role: "Siphon-Cutter", ancestry: "vulfen" },
];

const FLOOR_PLANS = [
  { building: "Conduit House Floor Plan", faction: "Guild of Conduits" },
  { building: "The Meterhouse Floor Plan", faction: "Mana Authority" },
  { building: "The Tallyhouse Floor Plan", faction: "Ratio Office" },
  { building: "White Line Barracks Floor Plan", faction: "White Line Wardens" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function initials(name) {
  const clean = name.replace(/^(Chief Rationer|Clerk|Forecaster|Warden-Commander|Mercy-Warden|Corporal|Castellan|Inspector|Master)\s+/i, "");
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fitFont(text, innerWidth, max, min) {
  const f = innerWidth / (0.56 * Math.max(1, text.length));
  return Math.round(Math.min(max, Math.max(min, f)));
}

function render(svg, outPath) {
  const resvg = new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "Arial" } });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, resvg.render().asPng());
  console.log("  wrote", path.relative(vaultRoot, outPath));
}

// ── NPC portrait ────────────────────────────────────────────────────────────────
function npcSvg(npc) {
  const t = THEMES[npc.faction];
  const W = 512, H = 640;
  const nameFont = fitFont(npc.name, 452, 30, 17);
  const subtitle = `${npc.role} · ${npc.ancestry}`;
  const subFont = fitFont(subtitle, 452, 19, 13);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/>
      <stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </radialGradient>
    <linearGradient id="banner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.bg2}" stop-opacity="0"/>
      <stop offset="0.35" stop-color="${t.bg2}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${t.bg2}" stop-opacity="0.98"/>
    </linearGradient>
    <clipPath id="frame"><rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="18"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" rx="24" fill="url(#bg)"/>
  <g clip-path="url(#frame)">
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="url(#bg)"/>
    <!-- bust silhouette -->
    <circle cx="256" cy="244" r="96" fill="${t.light}" fill-opacity="0.14"/>
    <path d="M256 332 C 150 332 96 430 90 560 L 422 560 C 416 430 362 332 256 332 Z" fill="${t.light}" fill-opacity="0.14"/>
    <!-- monogram -->
    <circle cx="256" cy="244" r="60" fill="${t.accent}" fill-opacity="0.18" stroke="${t.accent}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="256" y="266" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="${t.light}" fill-opacity="0.92">${esc(initials(npc.name))}</text>
    <rect x="14" y="0" width="${H}" height="${H}" fill="url(#vig)"/>
    <!-- bottom banner -->
    <rect x="14" y="470" width="${W - 28}" height="${H - 470 - 14}" fill="url(#banner)"/>
    <text x="256" y="566" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${nameFont}" font-weight="700" fill="${t.light}">${esc(npc.name)}</text>
    <text x="256" y="598" text-anchor="middle" font-family="Arial, sans-serif" font-size="${subFont}" fill="${t.accent}" letter-spacing="0.5">${esc(subtitle)}</text>
  </g>
  <!-- top faction tag -->
  <text x="256" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="${t.accent}">${esc(t.tag.toUpperCase())}</text>
  <line x1="186" y1="64" x2="326" y2="64" stroke="${t.accent}" stroke-opacity="0.6" stroke-width="1.5"/>
  <!-- frame -->
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="18" fill="none" stroke="${t.accent}" stroke-width="3" stroke-opacity="0.85"/>
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="14" fill="none" stroke="${t.accent}" stroke-width="1" stroke-opacity="0.35"/>
</svg>`;
}

// ── Floor plan blueprint ──────────────────────────────────────────────────────
function parseFloors(notePath) {
  const text = fs.readFileSync(notePath, "utf8").replace(/^---[\s\S]*?---/, "");
  const floors = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const h = raw.match(/^##\s+(.+)$/);
    if (h) {
      const heading = h[1].trim();
      if (/^(the building|related notes)$/i.test(heading)) { current = null; continue; }
      current = { name: heading, rooms: [] };
      floors.push(current);
      continue;
    }
    const b = raw.match(/^\s*-\s+(.+)$/);
    if (b && current) {
      const bold = b[1].match(/\*\*(.+?)\*\*/);
      const name = (bold ? bold[1] : b[1].split(":")[0]).replace(/\[\[|\]\]/g, "").trim();
      if (name) current.rooms.push(name);
    }
  }
  return floors.filter((f) => f.rooms.length);
}

function wrapLabel(name, max = 17) {
  const words = name.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) { lines.push(line); line = w; }
    else line = (line + " " + w).trim();
    if (lines.length === 2) break;
  }
  if (line && lines.length < 2) lines.push(line);
  return lines.slice(0, 2);
}

function floorPlanSvg(building, faction, floors) {
  const t = THEMES[faction];
  const W = 1120, pad = 40, headH = 104;
  const boxW = 212, boxH = 62, gx = 16, gy = 14;
  const perRow = Math.floor((W - 2 * pad + gx) / (boxW + gx));
  const floorHeadH = 38;

  const blocks = floors.map((f) => {
    const rows = Math.ceil(f.rooms.length / perRow);
    return { ...f, rows, height: floorHeadH + rows * (boxH + gy) };
  });
  const H = headH + blocks.reduce((s, b) => s + b.height, 0) + pad + 14;

  let body = "";
  let y = headH + 8;
  for (const b of blocks) {
    body += `<text x="${pad}" y="${y + 22}" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2" fill="${t.accent}">${esc(b.name.toUpperCase())}</text>`;
    body += `<line x1="${pad}" y1="${y + 32}" x2="${W - pad}" y2="${y + 32}" stroke="${t.accent}" stroke-opacity="0.3" stroke-width="1"/>`;
    let rx = pad, ry = y + floorHeadH, col = 0;
    for (const room of b.rooms) {
      const lines = wrapLabel(room);
      const tx = rx + boxW / 2;
      const startY = ry + boxH / 2 - (lines.length - 1) * 9 + 5;
      body += `<rect x="${rx}" y="${ry}" width="${boxW}" height="${boxH}" rx="7" fill="${t.light}" fill-opacity="0.05" stroke="${t.accent}" stroke-opacity="0.55" stroke-width="1.5"/>`;
      lines.forEach((ln, i) => {
        body += `<text x="${tx}" y="${startY + i * 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${t.light}">${esc(ln)}</text>`;
      });
      col += 1; rx += boxW + gx;
      if (col >= perRow) { col = 0; rx = pad; ry += boxH + gy; }
    }
    y += b.height;
  }

  const title = building.replace(/ Floor Plan$/i, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/>
      <stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
    <linearGradient id="hd" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.accent}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${t.accent}" stop-opacity="0.05"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="${t.light}" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect x="0" y="0" width="${W}" height="${headH}" fill="url(#hd)"/>
  <text x="${pad}" y="56" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="700" fill="${t.light}">${esc(title)}</text>
  <text x="${pad}" y="84" font-family="Arial, sans-serif" font-size="16" letter-spacing="4" fill="${t.accent}">FLOOR PLAN · ${esc(t.tag.toUpperCase())}</text>
  <line x1="0" y1="${headH}" x2="${W}" y2="${headH}" stroke="${t.accent}" stroke-opacity="0.5" stroke-width="2"/>
  ${body}
  <rect x="3" y="3" width="${W - 6}" height="${H - 6}" fill="none" stroke="${t.accent}" stroke-opacity="0.7" stroke-width="3"/>
</svg>`;
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log("NPC portraits:");
for (const npc of NPCS) {
  const dir = npc.dir ? path.join(vaultRoot, npc.dir) : path.join(vaultRoot, "05 NPCs", "Aethergate", npc.faction);
  const out = path.join(dir, "Portraits", `${npc.name} - Portrait.png`);
  render(npcSvg(npc), out);
}

console.log("Floor plans:");
for (const fp of FLOOR_PLANS) {
  const notePath = path.join(vaultRoot, "01 Locations", "Aethergate", `${fp.building}.md`);
  const floors = parseFloors(notePath);
  const out = path.join(vaultRoot, "01 Locations", "Aethergate", "Maps", `${fp.building}.png`);
  render(floorPlanSvg(fp.building, fp.faction, floors), out);
}

console.log("Done.");
