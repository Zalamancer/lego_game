#!/usr/bin/env node
// Build assets/parts-catalog.json from the local LDraw library + curated
// essentials (esp. Technic gears/axles/pins/beams for working mechanisms).
//
// Usage:
//   node scripts/build-catalog.mjs
//
// Prereq: assets/ldraw/ populated by scripts/setup-ldraw.sh

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, '..');
const PARTS_DIR = path.join(ROOT, 'assets/ldraw/parts');
const OUT = path.join(ROOT, 'assets/parts-catalog.json');

// ---------- Guaranteed-include Technic essentials ----------
// These are the building blocks engineering students need for working
// mechanisms: gears, axles, pins, beams/liftarms, and connectors.
const TECHNIC_ESSENTIALS = {
  gear: [
    ['3647',  'Gear 8 Tooth'],
    ['3648',  'Gear 24 Tooth'],
    ['3649',  'Gear 40 Tooth'],
    ['32270', 'Gear 12 Tooth Double Bevel'],
    ['32269', 'Gear 20 Tooth Double Bevel'],
    ['87407', 'Gear 12 Tooth Bevel'],
    ['94925', 'Gear 20 Tooth Bevel'],
    ['6589',  'Gear 16 Tooth'],
    ['4019',  'Gear 16 Tooth (old mold)'],
    ['3650',  'Gear Worm Screw'],
    ['4716',  'Worm Gear Block'],
    ['2907',  'Gear 14 Tooth Bevel'],
    ['3743',  'Gear Rack 1×4'],
    ['4296',  'Gear Rack 1×8'],
    ['18946', 'Gear 28 Tooth Double Bevel'],
    ['24505', 'Gear 36 Tooth Double Bevel'],
    ['10928', 'Gear 16 Tooth Reinforced'],
    ['27938', 'Gear Rack 4L Curved'],
  ],
  technic: [
    // Pins
    ['3673',  'Technic Pin'],
    ['4274',  'Technic Pin ½'],
    ['2780',  'Technic Pin with Friction'],
    ['6558',  'Technic Pin 3L with Friction'],
    ['32054', 'Technic Pin 3L with Stop Bush'],
    ['32556', 'Technic Pin 3L'],
    ['43093', 'Technic Axle Pin with Friction'],
    ['6628',  'Technic Friction Pin with Tow Ball'],
    ['75535', 'Technic Pin Joiner Round'],
    ['62462', 'Technic Pin Joiner 3L with 4 Pins'],
    // Axles
    ['3704',  'Technic Axle 2'],
    ['4519',  'Technic Axle 3'],
    ['3705',  'Technic Axle 4'],
    ['3706',  'Technic Axle 6'],
    ['3707',  'Technic Axle 8'],
    ['3708',  'Technic Axle 12'],
    ['32062', 'Technic Axle 2 Notched'],
    ['24316', 'Technic Axle 5.5 with Stop'],
    ['50451', 'Technic Axle 11'],
    ['55013', 'Technic Axle 10'],
    ['60485', 'Technic Axle 9'],
    ['87083', 'Technic Axle 4 with Stop'],
    ['99008', 'Technic Axle 5 with Stop'],
    // Connectors
    ['32013', 'Technic Angle Connector #1 (0°)'],
    ['32034', 'Technic Angle Connector #2 (180°)'],
    ['32016', 'Technic Angle Connector #3 (157.5°)'],
    ['32192', 'Technic Angle Connector #4 (135°)'],
    ['32015', 'Technic Angle Connector #5 (112.5°)'],
    ['32014', 'Technic Angle Connector #6 (90°)'],
    ['59443', 'Technic Axle Connector'],
    ['6536',  'Technic Axle Joiner Perpendicular'],
    ['42003', 'Technic Axle Joiner Perpendicular 3L'],
    ['48989', 'Technic Pin Connector Toggle Joint'],
    // Bushes / misc mechanical
    ['3713',  'Technic Bush'],
    ['32123', 'Technic Bush ½ Smooth'],
    ['2909',  'Technic Crank Handle'],
    ['2853',  'Technic Crank'],
    ['61903', 'Technic Cam'],
    ['6573',  'Differential Housing (old)'],
    ['62821', 'Differential 28 Tooth Bevel'],
    ['4185',  'Technic Wedge Belt Wheel (pulley)'],
    ['3483',  'Technic Chain Link'],
  ],
  beam: [
    ['43857', 'Technic Beam 2'],
    ['32523', 'Technic Beam 3'],
    ['32316', 'Technic Beam 5'],
    ['32524', 'Technic Beam 7'],
    ['40490', 'Technic Beam 9'],
    ['32525', 'Technic Beam 11'],
    ['41239', 'Technic Beam 13'],
    ['32278', 'Technic Beam 15'],
    ['41677', 'Technic Beam 2 Thin'],
    ['6632',  'Technic Beam 3 Thin'],
    ['32449', 'Technic Beam 4 Thin'],
    ['11478', 'Technic Beam 5 Thin'],
    ['32017', 'Technic Beam 5 Thick'],
    ['32140', 'Technic Beam 5 Bent 90°'],
    ['32271', 'Technic Beam 3×5 L-Shape'],
    ['32526', 'Technic Beam 3×5 L-Shape Thick'],
    ['32348', 'Technic Beam 3×7 Bent'],
  ],
};

// Common-brick essentials — make sure these are in 'Essentials' no matter what.
const COMMON_ESSENTIALS = [
  ['3005',  'Brick 1×1',           'brick'],
  ['3004',  'Brick 1×2',           'brick'],
  ['3622',  'Brick 1×3',           'brick'],
  ['3010',  'Brick 1×4',           'brick'],
  ['3009',  'Brick 1×6',           'brick'],
  ['3008',  'Brick 1×8',           'brick'],
  ['3003',  'Brick 2×2',           'brick'],
  ['3002',  'Brick 2×3',           'brick'],
  ['3001',  'Brick 2×4',           'brick'],
  ['3024',  'Plate 1×1',           'plate'],
  ['3023',  'Plate 1×2',           'plate'],
  ['3623',  'Plate 1×3',           'plate'],
  ['3710',  'Plate 1×4',           'plate'],
  ['3666',  'Plate 1×6',           'plate'],
  ['3460',  'Plate 1×8',           'plate'],
  ['3022',  'Plate 2×2',           'plate'],
  ['3021',  'Plate 2×3',           'plate'],
  ['3020',  'Plate 2×4',           'plate'],
  ['3795',  'Plate 2×6',           'plate'],
  ['3034',  'Plate 2×8',           'plate'],
  ['3070b', 'Tile 1×1',            'tile'],
  ['3069b', 'Tile 1×2',            'tile'],
  ['63864', 'Tile 1×3',            'tile'],
  ['2431',  'Tile 1×4',            'tile'],
  ['3068b', 'Tile 2×2',            'tile'],
  ['87079', 'Tile 2×4',            'tile'],
  ['3040',  'Slope 45° 2×1',       'slope'],
  ['3039',  'Slope 45° 2×2',       'slope'],
  ['3038',  'Slope 45° 2×3',       'slope'],
  ['3037',  'Slope 45° 2×4',       'slope'],
  ['3665',  'Slope Inverted 45° 2×1', 'slope'],
  ['3660',  'Slope Inverted 45° 2×2', 'slope'],
  ['54200', 'Slope 30° 1×1 (cheese)', 'slope'],
  ['4073',  'Round Plate 1×1',     'round'],
  ['4032a', 'Round Plate 2×2',     'round'],
  ['3941',  'Round Brick 2×2',     'round'],
  ['3062b', 'Round Brick 1×1',     'round'],
  ['87580', 'Plate 2×2 Jumper',    'plate'],
  ['3794',  'Plate 1×2 Jumper',    'plate'],
  ['87087', 'Brick 1×1 w/ Stud on Side', 'brick'],
  ['3700',  'Technic Brick 1×2 (hole)',  'technic'],
  ['3701',  'Technic Brick 1×4 (holes)', 'technic'],
];

// ---------- LDraw !CATEGORY → our category id ----------
const CAT_EXACT = {
  'Brick':               'brick',
  'Brick Round':         'round',
  'Brick Sloped':        'slope',
  'Plate':               'plate',
  'Plate Round':         'round',
  'Plate Wedge':         'plate',
  'Tile':                'tile',
  'Tile Round':          'tile',
  'Tile Curved':         'tile',
  'Slope':               'slope',
  'Slope Curved':        'slope-curved',
  'Slope Inverted':      'slope',
  'Wedge':               'slope',
  'Wedge Curved':        'slope-curved',
  'Technic':             'technic',
  'Technic Beam':        'beam',
  'Technic Liftarm':     'beam',
  'Technic Axle':        'technic',
  'Technic Pin':         'technic',
  'Technic Connector':   'technic',
  'Technic Gear':        'gear',
  'Technic Bush':        'technic',
  'Minifig':             'minifig',
  'Minifig Headgear':    'minifig',
  'Minifig Body Wear':   'minifig',
  'Minifig Hipwear':     'minifig',
  'Minifig Neckwear':    'minifig',
  'Minifig Footwear':    'minifig',
  'Minifig Accessory':   'accessory',
  'Minifig Weapon':      'accessory',
  'Minifig Tool':        'accessory',
  'Figure':              'minifig',
  'Wheel':               'wheel',
  'Tyre':                'tyre',
  'Vehicle':             'vehicle',
  'Vehicle Base':        'vehicle',
  'Window':              'window',
  'Door':                'door',
  'Windscreen':          'windscreen',
  'Panel':               'panel',
  'Bracket':             'bracket',
  'Arch':                'arch',
  'Cone':                'cone',
  'Cylinder':            'cylinder',
  'Plant':               'plant',
  'Animal':              'animal',
  'Hinge':               'hinge',
  'Dish':                'round',
  'Propeller':           'vehicle',
  'Staircase':           'brick',
  'Fence':               'panel',
  'Bar':                 'accessory',
};

function classify(rawCat, desc = '') {
  // Try !CATEGORY header first (exact, then prefix, then first word).
  if (rawCat) {
    const c = rawCat.trim();
    if (CAT_EXACT[c]) return CAT_EXACT[c];
    const base = c.replace(/[,]?\s*(Modified|Printed).*$/i, '').trim();
    if (CAT_EXACT[base]) return CAT_EXACT[base];
    const first = c.split(/[\s,]/)[0];
    if (CAT_EXACT[first]) return CAT_EXACT[first];
  }
  // Description-based fallback — look at the first 1-2 meaningful words.
  // This matters a lot: most LDraw parts infer category from description,
  // and compound categories like "Technic Gear" need the 2nd word to split
  // gears (→ gear) from pins/axles/connectors (→ technic).
  if (desc) {
    const words = desc.replace(/^_/, '').split(/\s+/);
    const w1 = words[0] || '';
    const w2 = words[1] || '';
    if (w1 === 'Technic') {
      if (/^Gear/i.test(w2)) return 'gear';
      if (/^Beam|^Liftarm/i.test(w2)) return 'beam';
      return 'technic';
    }
    if (w1 === 'Slope' && /Curved/i.test(w2)) return 'slope-curved';
    if (w1 === 'Wedge' && /Curved/i.test(w2)) return 'slope-curved';
    if (w1 === 'Brick' && /Round/i.test(w2)) return 'round';
    if (w1 === 'Plate' && /Round/i.test(w2)) return 'round';
    if (w1 === 'Tile' && /Round/i.test(w2)) return 'tile';
    if (w1 === 'Minifig' && /Accessor|Weapon|Tool|Utensil/i.test(w2)) return 'accessory';
    if (CAT_EXACT[w1]) return CAT_EXACT[w1];
  }
  return null;
}

// ---------- Per-category caps ----------
const CAPS = {
  brick:        140,
  plate:        140,
  tile:         70,
  slope:        90,
  'slope-curved': 50,
  round:        70,
  gear:         30,   // augmented by essentials
  beam:         50,   // augmented by essentials
  technic:      120,  // augmented by essentials (pins/axles/connectors)
  minifig:      60,
  accessory:    60,
  wheel:        30,
  tyre:         20,
  vehicle:      30,
  window:       20,
  door:         20,
  windscreen:   15,
  panel:        40,
  bracket:      25,
  arch:         25,
  cone:         20,
  cylinder:     15,
  plant:        20,
  animal:       20,
  hinge:        20,
};

const CATEGORY_LABELS = {
  essentials:    'Essentials',
  brick:         'Bricks',
  plate:         'Plates',
  tile:          'Tiles',
  slope:         'Slopes',
  'slope-curved':'Curved Slopes',
  round:         'Round',
  gear:          'Gears',
  beam:          'Beams',
  technic:       'Technic',
  minifig:       'Minifig',
  accessory:     'Accessories',
  wheel:         'Wheels',
  tyre:          'Tyres',
  vehicle:       'Vehicle',
  window:        'Windows',
  door:          'Doors',
  windscreen:    'Windscreens',
  panel:         'Panels',
  bracket:       'Brackets',
  arch:          'Arches',
  cone:          'Cones',
  cylinder:      'Cylinders',
  plant:         'Plants',
  animal:        'Animals',
  hinge:         'Hinges',
};

// Display order of tabs.
const CATEGORY_ORDER = [
  'essentials',
  'brick','plate','tile','slope','slope-curved','round','arch',
  'gear','beam','technic',
  'wheel','tyre','vehicle','windscreen',
  'window','door','panel','bracket','hinge','cone','cylinder',
  'minifig','accessory',
  'plant','animal',
];

// ---------- Filters ----------
// Only top-level parts: plain number + optional single letter mold variant.
// Printed (`p…`), stickered (`s…` / `ps…`), pattern (`pb…`) variants excluded.
const PART_FILE = /^[0-9]+[a-z]?\.dat$/;

// Drop descriptions that signal an unhelpful variant.
const BAD_DESC = /\b(Obsolete|Sticker|Pattern|Decoration|Hologram|Custom)\b/i;
// Prefer short, canonical descriptions over bloated "modified with bells and whistles" variants.
function qualityScore(p) {
  // lower = better
  let s = p.name.length;
  // penalty for "Modified", "with", commas (variant indicators)
  if (/\bwith\b/i.test(p.name)) s += 30;
  if (/\bModified\b/i.test(p.name)) s += 20;
  if (/\(/.test(p.name)) s += 10;
  // shorter part numbers = older / more canonical
  const numPart = parseInt(p.num.match(/^\d+/)?.[0] ?? '999999', 10);
  s += Math.log10(Math.max(1, numPart)) * 3;
  return s;
}

// ---------- Header parsing ----------
function cleanName(desc) {
  return desc
    .replace(/^~/, '')            // "~Moved to…" — we'd never keep these but be safe
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+x\s+/g, ' × ')   // "2 x 4" → "2 × 4"
    .trim();
}

async function parseHeader(file) {
  // Header is always in first ~1-2KB; read just a slice.
  const fh = await fs.open(path.join(PARTS_DIR, file), 'r');
  try {
    const buf = Buffer.alloc(2048);
    const { bytesRead } = await fh.read(buf, 0, 2048, 0);
    const text = buf.toString('utf8', 0, bytesRead);
    const lines = text.split(/\r?\n/).slice(0, 40);
    let desc = '';
    let cat = '';
    let keywords = '';
    let skip = false;
    if (lines[0]) desc = lines[0].replace(/^0\s+/, '').trim();

    // ~ prefix = redirect / moved / do-not-use → skip
    if (desc.startsWith('~')) skip = true;

    for (const l of lines) {
      const mC = l.match(/^0\s+!CATEGORY\s+(.+)/);
      if (mC) cat = mC[1].trim();
      const mK = l.match(/^0\s+!KEYWORDS\s+(.+)/);
      if (mK) keywords += ' ' + mK[1];
      // LDRAW_ORG kind filter. Examples:
      //   "!LDRAW_ORG Part UPDATE 2024-01"   → keep
      //   "!LDRAW_ORG Unofficial_Part"        → keep
      //   "!LDRAW_ORG Subpart"                → skip
      //   "!LDRAW_ORG Primitive"              → skip
      //   "!LDRAW_ORG Shortcut"               → keep (shortcuts = composite parts, often useful)
      const mOrg = l.match(/^0\s+!LDRAW_ORG\s+(\S+)/);
      if (mOrg) {
        const kind = mOrg[1];
        if (/Subpart|Primitive/i.test(kind)) skip = true;
      }
    }

    // NOTE: we do NOT fill `cat` from the description here. classify()
    // does the full desc analysis (including compound forms like
    // "Technic Gear" → gear), so leaving cat empty lets that logic run.

    return { desc, cat, keywords, skip };
  } finally {
    await fh.close();
  }
}

// ---------- Main ----------
async function main() {
  try {
    await fs.access(PARTS_DIR);
  } catch {
    console.error(`Missing ${PARTS_DIR} — run scripts/setup-ldraw.sh first.`);
    process.exit(1);
  }

  const all = await fs.readdir(PARTS_DIR);
  const files = all.filter(f => PART_FILE.test(f));
  console.log(`Scanning ${files.length} candidate parts (of ${all.length} total files)…`);

  const parts = [];
  const CHUNK = 400;
  for (let i = 0; i < files.length; i += CHUNK) {
    const batch = await Promise.all(files.slice(i, i + CHUNK).map(async f => {
      try {
        const h = await parseHeader(f);
        if (!h.desc || h.skip) return null;
        if (BAD_DESC.test(h.desc)) return null;
        return {
          num: f.replace(/\.dat$/, ''),
          name: cleanName(h.desc),
          rawCat: h.cat,
          rawDesc: h.desc,
        };
      } catch { return null; }
    }));
    for (const p of batch) if (p) parts.push(p);
    if ((i + CHUNK) % 4000 < CHUNK) process.stdout.write(`  …${Math.min(i + CHUNK, files.length)}\n`);
  }

  // Bucket by our category id
  const groups = new Map(); // id -> [{num,name}]
  let unclassified = 0;
  for (const p of parts) {
    const id = classify(p.rawCat, p.rawDesc);
    if (!id) { unclassified++; continue; }
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push({ num: p.num, name: p.name });
  }

  // Sort each group by quality, then cap
  for (const [id, arr] of groups) {
    arr.sort((a, b) => qualityScore(a) - qualityScore(b));
    const cap = CAPS[id] ?? 40;
    groups.set(id, arr.slice(0, cap));
  }

  // Merge Technic essentials — guarantees gears/axles/pins/beams present
  for (const [id, extras] of Object.entries(TECHNIC_ESSENTIALS)) {
    if (!groups.has(id)) groups.set(id, []);
    const have = new Set(groups.get(id).map(p => p.num));
    for (const [num, name] of extras) {
      if (!have.has(num)) {
        groups.get(id).unshift({ num, name });   // push to top — essentials first
        have.add(num);
      } else {
        // replace name with our cleaner label
        const idx = groups.get(id).findIndex(p => p.num === num);
        groups.get(id)[idx] = { num, name };
        // move to top
        const [it] = groups.get(id).splice(idx, 1);
        groups.get(id).unshift(it);
      }
    }
  }

  // Build "Essentials" tab — COMMON_ESSENTIALS + a Technic sampler
  const essentialsList = [];
  const seenEss = new Set();
  function pushEss(num, name) {
    if (seenEss.has(num)) return;
    seenEss.add(num);
    essentialsList.push({ num, name });
  }
  for (const [num, name] of COMMON_ESSENTIALS) pushEss(num, name);
  // Technic sampler: a few gears + axles + pins + beams so engineering is one tab away
  const technicSampler = [
    '3673','4274','2780',                              // pins
    '3705','3706','3707',                              // axles
    '3647','3648','32270','32269','3650',              // gears
    '32523','32316','32524','32525',                   // beams
    '32013','32014',                                   // connectors
    '3713','2909',                                     // bush + crank
  ];
  for (const num of technicSampler) {
    // find the label from whichever group has it
    let found = null;
    for (const arr of groups.values()) {
      const m = arr.find(p => p.num === num);
      if (m) { found = m; break; }
    }
    if (found) pushEss(found.num, found.name);
  }

  // Assemble final catalog in display order
  const categories = [];
  const filledIds = new Set(groups.keys());
  categories.push({
    id: 'essentials',
    label: CATEGORY_LABELS.essentials,
    parts: essentialsList,
  });
  for (const id of CATEGORY_ORDER) {
    if (id === 'essentials') continue;
    if (!filledIds.has(id)) continue;
    const arr = groups.get(id);
    if (!arr.length) continue;
    categories.push({
      id,
      label: CATEGORY_LABELS[id] ?? id,
      parts: arr,
    });
  }
  // Any category not in CATEGORY_ORDER but present → append
  for (const id of filledIds) {
    if (CATEGORY_ORDER.includes(id)) continue;
    const arr = groups.get(id);
    categories.push({ id, label: CATEGORY_LABELS[id] ?? id, parts: arr });
  }

  const count = categories.reduce((s, c) => s + c.parts.length, 0);
  const totalUnique = new Set(categories.flatMap(c => c.parts.map(p => p.num))).size;

  const catalog = {
    generated: new Date().toISOString(),
    count,
    uniqueParts: totalUnique,
    categories,
  };

  await fs.writeFile(OUT, JSON.stringify(catalog, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(`  ${categories.length} categories, ${count} entries, ${totalUnique} unique parts`);
  console.log(`  (unclassified parts skipped: ${unclassified})`);
  for (const c of categories) console.log(`    ${c.id.padEnd(14)} ${String(c.parts.length).padStart(4)}  ${c.label}`);
}

main().catch(e => { console.error(e); process.exit(1); });
