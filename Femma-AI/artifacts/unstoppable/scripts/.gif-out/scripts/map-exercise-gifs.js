"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Build a complete ExerciseDB GIF map for every roadmap exercise.
 * Writes data/exerciseGifMap.json with found + missing entries.
 *
 * Run: npm run map:gifs
 */
const exerciseRoadmapData_1 = require("../lib/exerciseRoadmapData");
const exerciseGifMatch_1 = require("../lib/exerciseGifMatch");
const exercise_gifs_json_1 = __importDefault(require("../data/exercise-gifs.json"));
const fs = require('fs');
const path = require('path');
const CATALOG = exercise_gifs_json_1.default;
const API_BASE = 'https://oss.exercisedb.dev/api/v1';
// Compiled output lives in scripts/.gif-out/scripts → project data/ is ../../../data
const OUT = path.join(__dirname, '..', '..', '..', 'data', 'exerciseGifMap.json');
const MIN_SCORE = 80;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function scoreName(catalogName, query) {
    const q = (0, exerciseGifMatch_1.normalizeExerciseTitle)(query);
    const name = (0, exerciseGifMatch_1.normalizeExerciseTitle)(catalogName);
    if (!q || !name)
        return 0;
    if (name === q)
        return 1000;
    if (name.startsWith(q) || q.startsWith(name))
        return 850;
    if (name.includes(q) || q.includes(name))
        return 650;
    const qTokens = q.split(' ').filter((t) => t.length > 2);
    const nTokens = new Set(name.split(' '));
    const hits = qTokens.filter((t) => name.includes(t) || nTokens.has(t)).length;
    if (!qTokens.length)
        return 0;
    return Math.round((hits / qTokens.length) * 400);
}
function fuzzyCatalog(query) {
    const q = (0, exerciseGifMatch_1.normalizeExerciseTitle)(query);
    // Breath / meditation are not in ExerciseDB as real demos — never force a yoga pose.
    if (/^(deep )?breath|pranayama|box breathing|body scan|nidra|nervous system/.test(q)) {
        return null;
    }
    let best = null;
    let bestScore = 0;
    for (const row of CATALOG) {
        const score = scoreName(row.n, query);
        if (score > bestScore) {
            best = row;
            bestScore = score;
        }
    }
    if (!best || bestScore < MIN_SCORE)
        return null;
    // Block weak pose swaps (e.g. sun-salutation → random stretch).
    if (bestScore < 600 && q.split(' ').length >= 2)
        return null;
    return { row: best, score: bestScore };
}
async function apiSearch(query) {
    const url = `${API_BASE}/exercises/search?search=${encodeURIComponent(query)}&threshold=0.3&limit=15`;
    try {
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok || text.trim().startsWith('<'))
            return null;
        const json = JSON.parse(text);
        let best = null;
        for (const row of json.data || []) {
            if (!row.gifUrl)
                continue;
            const score = scoreName(row.name, query);
            if (!best || score > best.score)
                best = { name: row.name, gifUrl: row.gifUrl, score };
        }
        if (!best || best.score < MIN_SCORE)
            return null;
        return best;
    }
    catch {
        return null;
    }
}
function collectMoves() {
    const byTitle = new Map();
    for (const pack of Object.values(exerciseRoadmapData_1.CATEGORY_WEEKS)) {
        for (const pair of [...pack.home, ...pack.gym]) {
            for (const move of pair) {
                const key = (0, exerciseGifMatch_1.normalizeExerciseTitle)(move.title);
                const existing = byTitle.get(key);
                if (existing) {
                    existing.categories.add(pack.id);
                    continue;
                }
                byTitle.set(key, {
                    title: move.title,
                    animation: move.animation,
                    categories: new Set([pack.id]),
                });
            }
        }
    }
    // Deep breath daily yoga task (injected at runtime, not in week packs).
    if (!byTitle.has((0, exerciseGifMatch_1.normalizeExerciseTitle)('Deep breath exercise'))) {
        byTitle.set((0, exerciseGifMatch_1.normalizeExerciseTitle)('Deep breath exercise'), {
            title: 'Deep breath exercise',
            animation: 'breath',
            categories: new Set(['yoga']),
        });
    }
    return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
}
async function main() {
    const moves = collectMoves();
    const exercises = [];
    let found = 0;
    let missing = 0;
    let apiCalls = 0;
    console.log(`Matching ${moves.length} unique exercises against ExerciseDB…`);
    for (let i = 0; i < moves.length; i += 1) {
        const move = moves[i];
        const hit = (0, exerciseGifMatch_1.matchExerciseGif)(move.title, move.animation);
        const queries = [
            (0, exerciseGifMatch_1.searchQueryForHit)(hit, move.title),
            hit?.catalog,
            hit?.name,
            move.title,
            (0, exerciseGifMatch_1.normalizeExerciseTitle)(move.title),
        ].filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index);
        let entry = null;
        // 1) Rule + local catalog media id → ExerciseDB CDN
        if (hit?.media) {
            const url = (0, exerciseGifMatch_1.gifUrlFor)(hit);
            if (url) {
                entry = {
                    title: move.title,
                    animation: move.animation,
                    categories: [...move.categories],
                    status: 'found',
                    matchedName: hit.catalog || hit.name,
                    gifUrl: url,
                    source: 'rule',
                    score: 900,
                };
            }
        }
        // 2) Fuzzy against local ExerciseDB catalog dump
        if (!entry) {
            for (const q of queries) {
                const fuzzy = fuzzyCatalog(q);
                if (fuzzy) {
                    entry = {
                        title: move.title,
                        animation: move.animation,
                        categories: [...move.categories],
                        status: 'found',
                        matchedName: fuzzy.row.n,
                        gifUrl: `https://static.exercisedb.dev/media/${fuzzy.row.m}.gif`,
                        source: 'fuzzy',
                        score: fuzzy.score,
                    };
                    break;
                }
            }
        }
        // 3) Live API search (rate-limited) for leftovers
        if (!entry && apiCalls < 80) {
            for (const q of queries.slice(0, 2)) {
                apiCalls += 1;
                const api = await apiSearch(q);
                await sleep(180);
                if (api) {
                    entry = {
                        title: move.title,
                        animation: move.animation,
                        categories: [...move.categories],
                        status: 'found',
                        matchedName: api.name,
                        gifUrl: api.gifUrl,
                        source: 'api',
                        score: api.score,
                    };
                    break;
                }
            }
        }
        if (!entry) {
            entry = {
                title: move.title,
                animation: move.animation,
                categories: [...move.categories],
                status: 'missing',
                matchedName: null,
                gifUrl: null,
                source: null,
                score: 0,
            };
            missing += 1;
        }
        else {
            found += 1;
        }
        exercises.push(entry);
        if ((i + 1) % 40 === 0 || i === moves.length - 1) {
            console.log(`  ${i + 1}/${moves.length} — found ${found}, missing ${missing}`);
        }
    }
    const payload = {
        generatedAt: new Date().toISOString(),
        api: API_BASE,
        total: exercises.length,
        found,
        missing,
        exercises,
        missingTitles: exercises.filter((e) => e.status === 'missing').map((e) => e.title),
    };
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nWrote ${OUT}`);
    console.log(`Found: ${found} | Missing: ${missing} | Total: ${exercises.length}`);
    if (payload.missingTitles.length) {
        console.log('\nMissing GIFs:');
        for (const title of payload.missingTitles)
            console.log(`  - ${title}`);
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
