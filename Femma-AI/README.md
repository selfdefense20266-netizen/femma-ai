# Exercise GIF fix

## What was wrong
Your original file matched GIFs by the `animation` keyword (punch / kick / stretch …)
against a tiny lookup table, so the **exercise name was ignored**. That's why a push-up
showed a jump, every strike showed one boxing GIF, and yoga was wrong.

## What you have now

### `exercises-fixed.json` — ready to use immediately
Re-matched **by movement intent parsed from each title**, using the real GIFs that were
already in your data. Fixes 244 entries, adds web GIFs for 13 breathing/meditation items,
and leaves **0 missing**. Sources are tagged per entry:
- `intent` – confidently re-matched by title (e.g. push-up → push-up GIF)
- `web`    – breathing/meditation (Giphy URLs — swap for your own if you like)
- `fallback` – combat/floor drills with no exact offline GIF (routed to closest available)

### Known limit of the offline file
Your file only contained **51 unique GIFs**, so kicks/strikes/yoga still reuse a small pool
(e.g. all kicks share one GIF). To get *pixel-accurate* kick, punch, and yoga GIFs you must
pull from the full **1,500-exercise** live API — that's what the script below does.

## `fix-gifs.mjs` — run this for full accuracy (needs open internet)

```bash
node fix-gifs.mjs ./exercises-input.json ./exercises-fixed.json
```

It will:
1. Fetch the live ExerciseDB catalog (`https://oss.exercisedb.dev/api/v1`).
2. Fuzzy-match every title to the closest real exercise by name.
3. Fall back to the GIF already in your file when the API match is weak.
4. Use the curated web GIFs for breathing/meditation.

### Editing the breathing GIFs
Open `fix-gifs.mjs`, find the `WEB_GIFS` object near the top, and replace any URL with a
direct `.gif` link you prefer (Giphy “Copy GIF Link” works). Same map exists in the output
already, so you can also just edit the URLs in `exercises-fixed.json` directly.

## Tuning
- Raise/lower the `>= 34` threshold in `fix-gifs.mjs` to make API matches stricter/looser.
- Add entries to the `SYN` synonym map to improve matching for your specific title style.
