"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exerciseRoadmapData_1 = require("../lib/exerciseRoadmapData");
const exerciseGifMatch_1 = require("../lib/exerciseGifMatch");
const extras = [
    { title: 'Easy march with guard', animation: 'walk' },
    { title: '4 min Rower fat-burn home or gym', animation: 'walk' },
    { title: '5 min Bike intervals home or gym', animation: 'walk' },
    { title: '5 min Easy march with guard home or gym', animation: 'walk' },
    { title: '4 min Glute bridges home or gym', animation: 'hip' },
];
const sanity = [
    ['Rower fat-burn', 'walk', /row/i],
    ['Bike intervals', 'walk', /bike/i],
    ['Easy march with guard', 'walk', /knee|march/i],
    ['Glute bridges', 'hip', /glute|bridge/i],
    ['Treadmill incline walk', 'walk', /treadmill/i],
    ['Jump-rope rounds', 'jump', /rope|jack/i],
    ['Bodyweight squat pulses', 'squat', /squat/i],
    ['Walking lunges', 'lunge', /lunge/i],
    ['Forearm plank holds', 'plank', /plank/i],
    ['Jab-cross shadowboxing', 'punch', /box|hook/i],
];
const wrong = [
    ['Bike intervals', /treadmill/i],
    ['Easy march with guard', /treadmill/i],
    ['Rower fat-burn', /squat|treadmill|bike/i],
    ['Glute bridges', /squat|bike|treadmill/i],
];
function collectMoves() {
    const items = [...extras];
    for (const pack of Object.values(exerciseRoadmapData_1.CATEGORY_WEEKS)) {
        for (const pair of [...pack.home, ...pack.gym]) {
            for (const move of pair) {
                items.push({ title: move.title, animation: move.animation });
            }
        }
    }
    return items;
}
const seen = new Set();
const missing = [];
const bad = [];
let checked = 0;
for (const item of collectMoves()) {
    const key = `${(0, exerciseGifMatch_1.normalizeExerciseTitle)(item.title)}|${item.animation}`;
    if (seen.has(key))
        continue;
    seen.add(key);
    checked += 1;
    const hit = (0, exerciseGifMatch_1.matchExerciseGif)(item.title, item.animation);
    if (!hit || (!(0, exerciseGifMatch_1.gifUrlFor)(hit) && !hit.localKey)) {
        missing.push(`${item.title} [${item.animation}]`);
    }
}
for (const [title, animation, expect] of sanity) {
    const hit = (0, exerciseGifMatch_1.matchExerciseGif)(title, animation);
    const label = `${hit?.name || ''} ${(0, exerciseGifMatch_1.gifUrlFor)(hit || { name: '' })}`;
    if (!hit || !expect.test(hit.name) && !expect.test((0, exerciseGifMatch_1.gifUrlFor)(hit))) {
        if (!hit || !expect.test(hit.name)) {
            bad.push(`expected ${title} → ${expect} but got ${hit?.name || 'none'}`);
        }
    }
    void label;
}
for (const [title, deny] of wrong) {
    const hit = (0, exerciseGifMatch_1.matchExerciseGif)(title, 'walk');
    if (hit && deny.test(hit.name)) {
        bad.push(`${title} should not map to ${hit.name}`);
    }
}
console.log(`Checked ${checked} unique exercise titles.`);
if (missing.length) {
    console.error(`MISSING ${missing.length} GIFs`);
    for (const item of missing)
        console.error(`- ${item}`);
}
if (bad.length) {
    console.error(`WRONG ${bad.length} matches`);
    for (const item of bad)
        console.error(`- ${item}`);
}
if (missing.length || bad.length)
    process.exit(1);
console.log('Every exercise has a GIF, and sample titles map to the right move.');
