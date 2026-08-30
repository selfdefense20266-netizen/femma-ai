const fs = require('fs');
const path = require('path');

const catalog = require('../data/exercise-gifs.json');
const src = fs.readFileSync(path.join(__dirname, '../lib/exerciseRoadmapData.ts'), 'utf8');
const titles = new Set(['Easy march with guard']);
for (const match of src.matchAll(/move\('([^']+)'/g)) titles.add(match[1]);

const STOP = new Set([
  'min', 'home', 'gym', 'easy', 'light', 'fast', 'slow', 'with', 'from', 'after',
  'then', 'your', 'the', 'and', 'for', 'style', 'drill', 'practice', 'round',
  'rounds', 'combo', 'combos', 'technical', 'between', 'or',
]);

const HINTS = [
  [/bike|cycl/, 'bike'],
  [/march|high.?knee/, 'high knee'],
  [/jump.?rope|skipping/, 'jump rope'],
  [/jumping jack/, 'jack jump'],
  [/glute bridge/, 'glute bridge'],
  [/dead bug/, 'dead bug'],
  [/goblet/, 'goblet squat'],
  [/walking lunge/, 'walking lunge'],
  [/plank/, 'plank'],
  [/push-up|push up/, 'push-up'],
  [/burpee/, 'burpee'],
  [/mountain/, 'mountain climber'],
  [/treadmill|incline walk/, 'treadmill'],
  [/squat/, 'squat'],
  [/lunge/, 'lunge'],
  [/deadlift/, 'deadlift'],
  [/hip thrust/, 'hip thrust'],
  [/farmer/, 'farmers walk'],
  [/crunch/, 'crunch'],
  [/row(?!er)/, 'row'],
  [/kick/, 'kick'],
  [/boxing|jab|hook|punch/, 'boxing'],
];

function tokens(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

function hasWord(haystack, word) {
  return new RegExp(`(?:^|[^a-z])${word}s?(?:es)?(?:[^a-z]|$)`, 'i').test(haystack);
}

function score(row, title) {
  const titleTokens = tokens(title);
  let total = 0;
  let hits = 0;
  for (const word of titleTokens) {
    if (hasWord(row.n, word)) {
      hits += 1;
      total += word.length >= 5 ? 28 : 16;
    }
  }
  if (!hits) return 0;
  const extra = tokens(row.n).filter((word) => !titleTokens.some((item) => hasWord(word, item) || hasWord(item, word)));
  return total - extra.length * 5 - tokens(row.n).length;
}

const map = {};
for (const title of [...titles].sort()) {
  const hint = HINTS.find(([pattern]) => pattern.test(title))?.[1] || '';
  const pool = hint
    ? catalog.filter((row) => hint.split(' ').every((part) => hasWord(row.n, part) || row.n.includes(hint)))
    : catalog;
  const ranked = pool
    .map((row) => ({ row, s: score(row, title) }))
    .filter((item) => item.s > 8)
    .sort((a, b) => b.s - a.s);
  const best = ranked[0];
  map[title] = best ? { name: best.row.n, id: best.row.i, media: best.row.m } : null;
}

const outFile = path.join(__dirname, '../data/exerciseGifMap.json');
fs.writeFileSync(outFile, JSON.stringify(map, null, 2));

const misses = Object.entries(map).filter(([, value]) => !value).map(([title]) => title);
const reused = {};
for (const [title, value] of Object.entries(map)) {
  if (!value) continue;
  (reused[value.name] = reused[value.name] || []).push(title);
}
console.log('titles', titles.size, 'matched', Object.values(map).filter(Boolean).length, 'miss', misses.length);
console.log('\nMISS\n' + misses.join('\n'));
console.log('\nREUSED > 2');
for (const [name, list] of Object.entries(reused).filter(([, list]) => list.length > 2)) {
  console.log(`${name} (${list.length}) <- ${list.join(' | ')}`);
}
