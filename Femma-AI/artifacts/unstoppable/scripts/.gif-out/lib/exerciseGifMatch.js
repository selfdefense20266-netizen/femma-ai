"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExerciseTitle = normalizeExerciseTitle;
exports.matchExerciseGif = matchExerciseGif;
exports.gifUrlFor = gifUrlFor;
const exercise_gifs_json_1 = __importDefault(require("../data/exercise-gifs.json"));
const CATALOG = exercise_gifs_json_1.default;
const RULES = [
    { test: /\brower\b|\browing\b|row intervals/, name: 'Seated row', catalog: 'cable seated row' },
    { test: /\bbike\b|\bcycl/, name: 'Stationary bike', catalog: 'stationary bike run v. 3', localKey: 'bike' },
    { test: /jump.?rope|skipping/, name: 'Jump rope', catalog: 'jump rope', localKey: 'rope' },
    { test: /jumping jack/, name: 'Jumping jacks', catalog: 'jack jump (male)', localKey: 'jacks' },
    { test: /high.?knee|march|fast feet|in-place ladder/, name: 'High knees / march', catalog: 'high knee against wall', localKey: 'march' },
    { test: /treadmill|incline walk/, name: 'Treadmill walk', catalog: 'walking on incline treadmill', localKey: 'treadmill' },
    { test: /walk cool-down|walk between|posture walk|easy walk|fight-pace walk|fat-burn walk|interval walk|walking intervals|long walk/, name: 'Easy jog / walk', catalog: 'farmers walk', localKey: 'jog' },
    { test: /dead bug/, name: 'Dead bug', catalog: 'dead bug' },
    { test: /glute bridge march|bridge march/, name: 'Glute bridge march', catalog: 'glute bridge march' },
    { test: /glute bridge|bridges?\b/, name: 'Glute bridge', catalog: 'low glute bridge on floor' },
    { test: /hip thrust/, name: 'Hip thrust', catalog: 'resistance band hip thrusts on knees (female)' },
    { test: /goblet squat/, name: 'Goblet squat', catalog: 'dumbbell goblet squat' },
    { test: /walking lunge/, name: 'Walking lunge', catalog: 'walking lunge' },
    { test: /lunge jump/, name: 'Lunge jump', catalog: 'lunge with jump' },
    { test: /curtsy|curtsey/, name: 'Curtsey squat', catalog: 'curtsey squat' },
    { test: /split squat|bulgarian/, name: 'Split squat', catalog: 'split squats' },
    { test: /side lunge|lateral lunge/, name: 'Side lunge', catalog: 'barbell lateral lunge' },
    { test: /reverse lunge|forward lunge|pulse lunge|lunges?/, name: 'Forward lunge', catalog: 'forward lunge (male)' },
    { test: /jump squat|squat jump/, name: 'Jump squat', catalog: 'jump squat' },
    { test: /squat to reach|squat to overhead/, name: 'Squat to reach', catalog: 'squat to overhead reach' },
    { test: /wall-sit|wall sit/, name: 'Supported squat', catalog: 'potty squat with support', localKey: 'squat' },
    { test: /horse-stance|sumo squat|tempo squat|pause squat|bodyweight squat|squat pulse|squat/, name: 'Bodyweight squat', catalog: 'potty squat', localKey: 'squat' },
    { test: /wall push/, name: 'Wall push-up', catalog: 'push-up (wall)' },
    { test: /push-up|push up/, name: 'Push-up', catalog: 'push-up', localKey: 'pushup' },
    { test: /mountain.?climber/, name: 'Mountain climber', catalog: 'mountain climber' },
    { test: /burpee|sprawl/, name: 'Burpee', catalog: 'burpee' },
    { test: /plank shoulder tap|shoulder tap/, name: 'Shoulder tap', catalog: 'shoulder tap' },
    { test: /side plank/, name: 'Side plank', catalog: 'bodyweight incline side plank' },
    { test: /plank/, name: 'Plank', catalog: 'power point plank' },
    { test: /flutter/, name: 'Flutter kicks', catalog: 'flutter kicks' },
    { test: /crunch|oblique/, name: 'Crunch', catalog: 'crunch floor' },
    { test: /pallof/, name: 'Pallof press', catalog: 'band horizontal pallof press' },
    { test: /romanian deadlift|hip hinge/, name: 'Romanian deadlift', catalog: 'dumbbell romanian deadlift' },
    { test: /kettlebell deadlift|dumbbell deadlift|deadlift/, name: 'Deadlift', catalog: 'dumbbell deadlift' },
    { test: /thruster/, name: 'Thruster', catalog: 'kettlebell thruster' },
    { test: /farmer/, name: 'Farmer carry', catalog: 'farmers walk' },
    { test: /step-up|step up|stair/, name: 'Step-up', catalog: 'dumbbell step-up' },
    { test: /skater/, name: 'Skater hops', catalog: 'skater hops' },
    { test: /cable kickback|standing kickback/, name: 'Kickback', catalog: 'cable kickback' },
    { test: /seated row|band row|cable or band row|backpack or book row/, name: 'Seated row', catalog: 'cable seated row' },
    { test: /lat pulldown|pull-up/, name: 'Lat pulldown', catalog: 'cable lat pulldown full range of motion' },
    { test: /overhead press|shoulder press/, name: 'Shoulder press', catalog: 'band shoulder press' },
    { test: /lateral raise/, name: 'Lateral raise', catalog: 'dumbbell full can lateral raise' },
    { test: /bench or floor press|incline dumbbell press|floor press/, name: 'Bench press', catalog: 'barbell bench press' },
    { test: /close-grip press|triceps/, name: 'Close-grip press', catalog: 'barbell close-grip bench press' },
    { test: /back extension/, name: 'Back extension', catalog: 'lever back extension' },
    { test: /hamstring/, name: 'Hamstring stretch', catalog: 'hamstring stretch' },
    { test: /hip flexor/, name: 'Hip flexor stretch', catalog: 'intermediate hip flexor and quad stretch' },
    { test: /calf/, name: 'Calf stretch', catalog: 'calf stretch with hands against wall' },
    { test: /down.?dog|downward|cat-cow|cat cow/, name: 'Upward facing dog', catalog: 'upward facing dog' },
    { test: /sun.?salute|vinyasa|yoga|kata|pigeon|warrior|savasana|child/, name: 'Yoga flow', catalog: 'butterfly yoga pose', localKey: 'yoga' },
    { test: /stretch|mobility|hip opener|neck roll/, name: 'Full-body stretch', catalog: 'runners stretch' },
    { test: /jab|cross|hook|uppercut|shadowbox|shadow boxing|boxing|punch|palm strike|hammer-fist|bag work|bag combos|on the bag|on bag|mitt|pad-style|pad reverse/, name: 'Boxing hook', catalog: 'left hook. boxing' },
    { test: /kick chamber|front kick|roundhouse|mawashi|power kick|kick and punch|knee strike/, name: 'Leg kick', catalog: 'push-up inside leg kick' },
    { test: /battling rope|battle-rope|slam/, name: 'Medicine ball slam', catalog: 'medicine ball overhead slam' },
    { test: /kettlebell swing/, name: 'Kettlebell swing', catalog: 'kettlebell swing' },
    { test: /pelvic tilt/, name: 'Pelvic tilt', catalog: 'pelvic tilt' },
    { test: /superman/, name: 'Superman', catalog: 'superman push-up' },
    { test: /breath|exhale|box breathing|body scan|nervous system/, name: 'Calm breath / yoga', catalog: 'butterfly yoga pose', localKey: 'yoga' },
    { test: /footwork|stance|guard-up|parry|clinch|awareness|scenario|wrist-release|voice/, name: 'Boxing guard', catalog: 'left hook. boxing' },
    { test: /sled|prowler|machine circuit|spin cool/, name: 'Easy jog / walk', localKey: 'jog' },
    { test: /hollow/, name: 'Dead bug', catalog: 'dead bug' },
    { test: /core brace|anti-rotation|woodchop/, name: 'Pallof press', catalog: 'band horizontal pallof press' },
    { test: /hip escape|clams|leg lift|kickback/, name: 'Glute bridge', catalog: 'low glute bridge on floor' },
];
const ANIMATION_FALLBACK = {
    squat: { test: /.*/, name: 'Bodyweight squat', catalog: 'potty squat', localKey: 'squat' },
    lunge: { test: /.*/, name: 'Forward lunge', catalog: 'forward lunge (male)' },
    plank: { test: /.*/, name: 'Plank', catalog: 'power point plank' },
    walk: { test: /.*/, name: 'Easy jog / walk', localKey: 'jog' },
    jump: { test: /.*/, name: 'Jumping jacks', catalog: 'jack jump (male)', localKey: 'jacks' },
    core: { test: /.*/, name: 'Crunch', catalog: 'crunch floor' },
    hip: { test: /.*/, name: 'Glute bridge', catalog: 'low glute bridge on floor' },
    punch: { test: /.*/, name: 'Boxing hook', catalog: 'left hook. boxing' },
    guard: { test: /.*/, name: 'Boxing hook', catalog: 'left hook. boxing' },
    kick: { test: /.*/, name: 'Leg kick', catalog: 'push-up inside leg kick' },
    stretch: { test: /.*/, name: 'Full-body stretch', catalog: 'runners stretch' },
    flow: { test: /.*/, name: 'Yoga flow', catalog: 'butterfly yoga pose', localKey: 'yoga' },
    breath: { test: /.*/, name: 'Calm breath / yoga', catalog: 'butterfly yoga pose', localKey: 'yoga' },
    prenatal: { test: /.*/, name: 'Supported squat', catalog: 'potty squat with support', localKey: 'squat' },
    recover: { test: /.*/, name: 'Full-body stretch', catalog: 'runners stretch' },
};
function byName(name) {
    return CATALOG.find((row) => row.n === name) || null;
}
function normalizeExerciseTitle(title) {
    return title
        .toLowerCase()
        .replace(/^\d+\s*min\s+/, '')
        .replace(/\s+(home or gym|at the gym|at home)\s*$/i, '')
        .replace(/[^\w\s/+-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function resolve(rule) {
    const row = rule.catalog ? byName(rule.catalog) : null;
    if (row)
        return { name: rule.name, id: row.i, media: row.m, localKey: rule.localKey };
    if (rule.localKey)
        return { name: rule.name, localKey: rule.localKey };
    return null;
}
function matchExerciseGif(title, animation) {
    const key = normalizeExerciseTitle(title);
    const rule = RULES.find((item) => item.test.test(key));
    if (rule) {
        const hit = resolve(rule);
        if (hit)
            return hit;
    }
    const fallback = animation ? ANIMATION_FALLBACK[animation] : undefined;
    return fallback ? resolve(fallback) : null;
}
function gifUrlFor(hit) {
    return hit.id && hit.media
        ? `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/${hit.id}-${hit.media}.gif`
        : '';
}
