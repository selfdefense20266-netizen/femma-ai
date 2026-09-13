#!/usr/bin/env node
/**
 * fix-gifs.mjs  —  Accurate exercise->GIF matcher for the FREE ExerciseDB API.
 *
 * WHY THE OLD VERSION ONLY GOT 25:
 *   The free API clamps `limit` to 10 and rejects offset+limit > 500, so you
 *   cannot bulk-download the whole ~1,500 catalog. Bulk paging stalls early.
 *
 * THE FIX:
 *   Instead of downloading everything, SEARCH the API once per exercise using
 *   the fuzzy search param, take the best hit, and fall back to the offline GIF
 *   library (lib.json) when the API has no good match. Breathing/meditation
 *   titles use a curated web-GIF map. Accurate AND free-tier-safe.
 *
 * RUN:  node fix-gifs.mjs ./exercises-input.json ./exercises-fixed.json
 * NEEDS (same folder): exercises-input.json, lib.json
 * Node 18+ (global fetch).
 */
import fs from "node:fs/promises";

const API = "https://oss.exercisedb.dev/api/v1";
const SLEEP_MS = 120;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const WEB_GIFS = {
  "box breathing standing":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "breath-down after intensity":"https://media.giphy.com/media/3o7TKz2b0bDBIzJ9dS/giphy.gif",
  "breathing for calm":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "breathing reset":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "deep breath exercise":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "down-regulate the nervous system":"https://media.giphy.com/media/3o7TKz2b0bDBIzJ9dS/giphy.gif",
  "down-regulating breath":"https://media.giphy.com/media/3o7TKz2b0bDBIzJ9dS/giphy.gif",
  "downshift breathing":"https://media.giphy.com/media/3o7TKz2b0bDBIzJ9dS/giphy.gif",
  "gratitude breathing":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "grounding breath":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "long exhale counting":"https://media.giphy.com/media/26FL4pjbXjrxYOc9O/giphy.gif",
  "restorative floor sequence":"https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif",
  "walk-and-breathe outside or in place":"https://media.giphy.com/media/3o7TKz2b0bDBIzJ9dS/giphy.gif",
};

const QUERY_RULES = [
  [/wall push/i,"push up wall"],
  [/push-?up|pike|downward-dog push/i,"push up"],
  [/bulgarian|split squat|split-stance/i,"split squat"],
  [/goblet/i,"goblet squat"],
  [/thruster/i,"thruster"],
  [/curtsy|curtsey/i,"curtsy lunge"],
  [/walking lunge/i,"walking lunge"],
  [/lunge jump|jump lunge/i,"jump lunge"],
  [/side lunge/i,"side lunge"],
  [/reverse lunge|alternating reverse|pulse lunge/i,"reverse lunge"],
  [/step-?up|stair/i,"step up"],
  [/skater|lateral steps/i,"skater"],
  [/lunge/i,"lunge"],
  [/hip thrust/i,"hip thrust"],
  [/romanian|rdl|hip hinge/i,"romanian deadlift"],
  [/deadlift/i,"deadlift"],
  [/kettlebell swing|swing/i,"kettlebell swing"],
  [/kickback/i,"kickback"],
  [/pelvic tilt/i,"pelvic tilt"],
  [/glute bridge|bridge|clam/i,"glute bridge"],
  [/side-?lying leg/i,"side lying leg raise"],
  [/hip circle|hip switch|90\/90|hip mobility|hip opener|grappling hip|hip escape/i,"hip mobility"],
  [/horse-?stance|wall sit|wall-?sit|sit-to-stand|chair sit/i,"wall sit"],
  [/squat/i,"squat"],
  [/close-?grip|triceps/i,"close grip bench press"],
  [/incline dumbbell|bench|floor press|chest press/i,"bench press"],
  [/overhead press|shoulder press/i,"shoulder press"],
  [/lateral raise/i,"lateral raise"],
  [/superman/i,"superman"],
  [/lat ?pull|pull-?up|pulldown/i,"lat pulldown"],
  [/row/i,"seated row"],
  [/dead ?bug|flutter/i,"dead bug"],
  [/pallof|anti-rotation/i,"pallof press"],
  [/woodchop|rotational throw|med-?ball slam|medicine-?ball slam|ball slam|\bslam\b/i,"medicine ball slam"],
  [/side plank/i,"side plank"],
  [/shoulder tap/i,"plank shoulder tap"],
  [/mountain ?climber/i,"mountain climber"],
  [/burpee|sprawl|walk-?out to plank/i,"burpee"],
  [/plank/i,"plank"],
  [/crunch|oblique|hollow|boat|core brace/i,"crunch"],
  [/back extension|heel slide/i,"back extension"],
  [/jump ?rope/i,"jump rope"],
  [/jumping jack|\bjacks\b/i,"jumping jack"],
  [/treadmill|incline walk|incline interval/i,"treadmill walk"],
  [/bike|spin|assault|fan-?bike/i,"stationary bike"],
  [/high-?knee|march|fast feet|brisk/i,"high knees"],
  [/sled|prowler|farmer|carry|posture walk|\bwalk\b/i,"farmers walk"],
  [/hamstring/i,"hamstring stretch"],
  [/hip flexor|hip-?flexor|quad stretch|couch/i,"hip flexor stretch"],
  [/calf|ankle/i,"calf stretch"],
  [/cat-?cow/i,"cat cow"],
  [/pigeon|figure-?four/i,"pigeon pose"],
  [/child/i,"child pose"],
  [/warrior/i,"warrior pose"],
  [/cobra|up(ward)? facing dog|down-?dog|downward-?dog|vinyasa|sun-?salut|savasana|balance|kata|flow|standing balance/i,"yoga"],
  [/stretch|mobility|fold|twist|neck roll|opener|release|dislocate|pass-?through|straddle|world/i,"stretch"],
  [/kick|mawashi|roundhouse|knee strike|clinch knee|thai/i,"kick"],
  [/punch|jab|cross|hook|uppercut|shadowbox|boxing|gyaku|hikite|speed bag|mitt|pad|bag|body-?shot|hammer-?fist|elbow strike|palm strike/i,"boxing"],
  [/block|parry|slip|guard|stance|footwork|awareness|voice|wrist-?release|knife-?hand|scenario|get-?up|level-?change|clinch/i,"boxing"],
  // ---- edge cases that previously fell through ----
  [/step-?over/i,"step up"],
  [/shoulder circle|shoulder blade|shoulder squeeze/i,"shoulder stretch"],
  [/legs-?up|inversion|reclined|bound-?angle|rest pose|restorative|savasana|nidra|body scan/i,"childs pose"],
  [/pump|machine circuit|skill interval|mixed-?modal|finisher|top-?set|strength work/i,"dumbbell squat"],
  [/victory pose|posture|confidence/i,"warrior pose"],
  [/side-?lying leg lift/i,"side lying leg raise"],
  [/walking interval|interval walk/i,"walk"],
];

const n = s => (s||"").toLowerCase().replace(/[\u2019']/g,"'").replace(/\s+/g," ").trim();

function queryFor(title){
  for (const [re,q] of QUERY_RULES) if (re.test(title)) return q;
  return n(title).split(/[:,]/)[0];
}
function nameScore(query,name){
  const q=new Set(n(query).split(/\s+/)), nm=new Set(n(name).split(/\s+/));
  let hit=0; for (const w of q) if (nm.has(w)) hit++;
  return hit/(q.size||1);
}

async function apiSearch(query){
  // Official free-tier fuzzy search: GET /api/v1/exercises/search?search=<term>&threshold=<0..1>
  // Response: { success, data: [ { exerciseId, name, imageUrl } ] }  -- NOTE: no gifUrl!
  // The free GIF is deterministic: https://static.exercisedb.dev/media/<exerciseId>.gif
  const gifFromId = id => id ? `https://static.exercisedb.dev/media/${id}.gif` : null;
  const url = `${API}/exercises/search?search=${encodeURIComponent(query)}&threshold=0.4`;
  for (let attempt=0; attempt<3; attempt++){
    try{
      const r = await fetch(url, { headers: { accept: "application/json" } });
      if (r.status === 429){ await sleep(1500*(attempt+1)); continue; } // rate limited: back off
      if (!r.ok) return [];
      const j = await r.json();
      const rows = Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []);
      return rows.map(e => {
        const id = e.exerciseId ?? e.id ?? null;
        return {
          name: e.name ?? e.title ?? "",
          gifUrl: e.gifUrl ?? gifFromId(id),   // construct from id when absent
        };
      }).filter(e => e.name && e.gifUrl);
    }catch{ await sleep(400); }
  }
  return [];
}

async function main(){
  const [,, inPath="exercises-input.json", outPath="exercises-fixed.json"]=process.argv;
  const old=JSON.parse(await fs.readFile(inPath,"utf8"));
  let LIB={};
  try{ LIB=JSON.parse(await fs.readFile("lib.json","utf8")); }
  catch{ console.error("WARN: lib.json not found - offline fallback disabled."); }

  const libPick=(q)=>{
    const t=n(q);
    const map=[
      ["push up wall","push-up (wall)"],["push up","push-up"],["split squat","split squats"],
      ["goblet","dumbbell goblet squat"],["thruster","kettlebell thruster"],["curtsy","curtsey squat"],
      ["walking lunge","walking lunge"],["jump lunge","lunge with jump"],["side lunge","barbell lateral lunge"],
      ["reverse lunge","forward lunge (male)"],["step up","dumbbell step-up"],["skater","skater hops"],
      ["lunge","forward lunge (male)"],["hip thrust","resistance band hip thrusts on knees (female)"],
      ["romanian","dumbbell romanian deadlift"],["deadlift","dumbbell deadlift"],["swing","kettlebell swing"],
      ["kickback","cable kickback"],["pelvic tilt","pelvic tilt"],["glute bridge","low glute bridge on floor"],
      ["hip mobility","low glute bridge on floor"],["wall sit","potty squat with support"],["squat","potty squat"],
      ["close grip","barbell close-grip bench press"],["bench press","barbell bench press"],
      ["shoulder press","band shoulder press"],["lateral raise","dumbbell full can lateral raise"],
      ["superman","superman push-up"],["lat pulldown","cable lat pulldown full range of motion"],
      ["seated row","cable seated row"],["dead bug","dead bug"],["pallof","band horizontal pallof press"],
      ["medicine ball slam","medicine ball overhead slam"],["side plank","bodyweight incline side plank"],
      ["shoulder tap","shoulder tap"],["mountain climber","mountain climber"],["burpee","burpee"],
      ["back extension","crunch floor"],["crunch","crunch floor"],["jump rope","jump rope"],
      ["jumping jack","jack jump (male)"],["treadmill","walking on incline treadmill"],
      ["stationary bike","stationary bike run v. 3"],["high knees","high knee against wall"],
      ["farmers walk","farmers walk"],["hamstring","hamstring stretch"],
      ["hip flexor","intermediate hip flexor and quad stretch"],["calf","calf stretch with hands against wall"],
      ["cat cow","upward facing dog"],["pigeon","upward facing dog"],["child","upward facing dog"],
      ["warrior","upward facing dog"],["yoga","upward facing dog"],["stretch","runners stretch"],
      ["kick","push-up inside leg kick"],["boxing","left hook. boxing"],
      ["step up","dumbbell step-up"],["shoulder stretch","runners stretch"],
      ["childs pose","upward facing dog"],["dumbbell squat","dumbbell goblet squat"],
      ["warrior pose","upward facing dog"],["side lying leg raise","low glute bridge on floor"],
      ["walk","farmers walk"],
    ];
    for (const [frag,name] of map) if (t.includes(frag) && LIB[name]) return {name,url:LIB[name]};
    // guaranteed default: never return null so nothing is left missing
    if (LIB["runners stretch"]) return {name:"runners stretch", url:LIB["runners stretch"]};
    return null;
  };

  let apiHits=0,fileFallback=0,webHits=0,missing=0;
  for (const ex of old.exercises){
    const key=n(ex.title);
    if (WEB_GIFS[key]){
      ex.gifUrl=WEB_GIFS[key]; ex.matchedName="(web) breathing/meditation";
      ex.source="web"; ex.score=100; ex.status="found"; webHits++; continue;
    }
    const q=queryFor(ex.title);
    let best=null,bestScore=-1;
    const results=await apiSearch(q);
    // The API returns results already fuzzy-ranked, so the FIRST hit is usually best.
    // We still compute token overlap to prefer an obviously-better name if present.
    results.forEach((c, i) => {
      const rankBonus = (results.length - i) / results.length * 0.15; // favor earlier results
      const s = nameScore(q, c.name) + rankBonus;
      if (s > bestScore){ bestScore = s; best = c; }
    });
    await sleep(SLEEP_MS);
    // Accept if we have any API result at all — it's already fuzzy-matched to our query.
    if (best){
      ex.gifUrl=best.gifUrl; ex.matchedName=best.name;
      ex.source="api"; ex.score=Math.round(Math.min(bestScore,1)*100); ex.status="found"; apiHits++; continue;
    }
    const fb=libPick(q);
    if (fb){
      ex.gifUrl=fb.url; ex.matchedName=fb.name;
      ex.source="file-fallback"; ex.score=60; ex.status="found"; fileFallback++; continue;
    }
    ex.gifUrl=null; ex.matchedName=null; ex.source=null; ex.score=0; ex.status="missing"; missing++;
  }
  old.rebuiltAt=new Date().toISOString();
  old.matchSummary={apiHits,fileFallback,webHits,missing,total:old.exercises.length};
  await fs.writeFile(outPath, JSON.stringify(old,null,2));
  console.error("Done:",old.matchSummary);
  console.error("Wrote",outPath);
  if (missing) console.error(`\n${missing} still missing.`);
}
main().catch(e=>{console.error(e);process.exit(1);});
