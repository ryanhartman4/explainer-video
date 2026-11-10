# Scene builder brief

You are building scenes of a ~4:40 explainer video about Adam Hartman's `faultline` repo, for the author (an ML data scientist who knows LLMs, quantization basics and information theory). The video is HTML + GSAP rendered by HyperFrames. Narration is ElevenLabs voice; music is added later. The look is a 3Blue1Brown lesson: dark, quiet, precise, strokes that draw themselves on, dots that glide into place.

## Read first
1. `../DESIGN.md`: intent, palette, typography, what not to do. Follow it exactly.
2. `../SCRIPT.md`: for each of your scenes, the **Narration** (exact spoken words) and the **Screen** notes (what must appear). Every number on screen must come from SCRIPT.md or `data/data*.js`. Do not add claims, numbers or labels the script does not support.
3. `compositions/s01.html`: the finished exemplar. Copy its structure.
4. `lib/fl.js` and `lib/fl.css`: the shared helpers and styles.
5. HyperFrames rules: the `hyperframes` skill's `SKILL.md`, then `house-style.md` and `references/motion-principles.md` in that folder.

## Scene file contract (`compositions/sNN.html`)
- Wrap in `<template id="sNN-template">`, root `<div data-composition-id="sNN" data-width="1920" data-height="1080" id="root">`.
- Inside: `<link rel="stylesheet" href="../lib/fl.css" />`, then a `<style>` whose first rule is exactly
  `#root { position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden; color: var(--ink); font-family: var(--serif); background: radial-gradient(ellipse 70% 60% at 50% 45%, #13151c 0%, var(--canvas) 70%); }`
  Other selectors are plain (`.foo`, `#sNN-bar`); the runtime scopes them. Prefix every id with `sNN-` (all scenes share one DOM).
- Scripts, in this order: `../data/timing.js`, `../data/data.js`, `../data/data_repo.js`, `../lib/fl.js` (add `../assets/katex/katex.min.js` and a `<link>` to `../assets/katex/katex.min.css` if you use `K.tex`). gsap is already loaded by the root page.
- One IIFE builds the DOM that needs data, then `const tl = gsap.timeline({ paused: true });`, calls `K.enter(tl, N)` first (the crossfade in), adds tweens, and registers `window.__timelines["sNN"] = tl`. Build synchronously: no async, no timers, no fetch, no `Math.random()` (use `K.rng(seed)`), no `repeat: -1`.

## Timing: cue words, never clock times
Narration timing is a placeholder now and will change when the real voice is recorded. Position every tween with `K.cue(N, "word", occurrence, offset)` (seconds from scene start when that word is spoken; `occurrence` counts repeats of the same word in that scene's narration) or `K.cueEnd(...)`. Durations between cues: `K.cue(N,"b") - K.cue(N,"a")`. `K.dur(N)` is the scene length, `K.speechEnd(N)` when the voice stops. Small fixed offsets and tween durations are fine. Matching ignores case and punctuation; spelled-out TTS words are what count (`FLT4` is spoken as "F L T four", so cue on other words). A cue word that is not in the narration prints a red "missing cue" line on the frame: never leave one.

## Helpers (`lib/fl.js`, global `K`)
`K.cue`, `K.cueEnd`, `K.dur`, `K.speechEnd`, `K.rng(seed)`, `K.svg(tag, attrs, parent)` (attr `text` sets textContent), `K.el(tag, attrs, parent)` (`text`/`html`), `K.drawOn(tl, pathEl, at, dur, ease)` (stroke draws itself on), `K.driver(tl, state, draw)` (returns `go(key, at, dur, to=1, ease, from=0)`; `draw(state)` must be a pure function of `state`, so any seek order gives the same frame: use it for canvas and for anything with many elements), `K.canvas(parent, w, h, style)`, `K.strip(parent, proposer, verifier)` (corner strip), `K.glyph("proposer"|"verifier"|"map", parent, size)` (the three role icons; use them, do not redraw them), `K.tex(el, latex)`, `K.enter(tl, N)`, `K.clamp`, `K.ease`.
Only one `K.driver` per timeline (it owns the timeline's onUpdate); put every canvas key in that one `state`.

## Data (`window.FL`, from real code and a real weight matrix)
- `FL.hash`: the 3INST codebook. `edges` (57 bin edges, −3.5..3.5), `counts` (56; histogram of all 16,384 normalized hash values), `dots` `{bin, h, v}` for states 0..1399 (bin index, stack height within its bin, value) to rain into a dot histogram, `mean` 0, `std` 1, `n` 16384, `steps` (4 consecutive window steps `{nib, state, bits (14-char string), value}`).
- `FL.rotate`: one real 2048×2048 matrix (`tensor` names it), every 256-block scaled to unit RMS. `edges` (73, −9..9), `before`/`after` (72 histogram counts; use a log y axis), `kurt_before` 5.6, `kurt_after` 2.96 (a Gaussian is 3), `max_before` 15.1, `max_after` 5.5, `tail_before`/`tail_after` (share with |z| > 4), `block_before`/`block_after` (256 values of the block with the biggest outlier, before and after rotation), `hadamard16` (256 0/1 entries, 1 = +1, of the 16×16 Sylvester Hadamard), `signs16` (16 ±1).
- `FL.q4`: one real 32-weight group, unrotated. `values` (32), `levels` (16 evenly spaced between the group's min and max), `q` (level per weight), `outlier` (index), `used` (4 distinct levels used by the 32 weights), `rms`.
- `FL.flt4`: a real FLT4 encode (14-bit trellis, 3INST hash) of real rotated blocks. `true` / `decoded` (first 64 values of one block and its reconstruction), `states` (64 trellis states), `nmse_seed0` 0.00473 and `nmse_best4` 0.00455 (mean error over 96 blocks with one seed / best of four), `seed_err` (8 blocks × 4 seeds), `seed_best` (8).
- `FL.trellis`: a toy trellis small enough to draw: 16 states, 2 bits per step, next state `((s << 2) | b) & 15`. `codebook` (16 values), `true` (12 weights), `path` (12 states), `decoded` (12).
- `FL.rd`: `R` (41 rates, 1..5 bits), `limit` (2^(−2R)), `lloyd_max` {"1": 0.3634, … "4": 0.009497, "5": 0.002499}, `flt4_roadmap` 0.00462, `flt4_here` 0.00455.
- `FL.contour`: a Contour run on a toy pass/fail space. `tests` `{x, y ∈ [0,1], fail, sig ∈ "oom"|"diverged"|"slow"|null, explore}` in the order Contour chose them, `rounds` `{n, gt (Good-Turing chance the next failure is new), unc (untested share), modes}`, `stopped`. Currently a **placeholder** (`placeholder: true`); the real run has the same shape. Draw the pass/fail map from the tests seen so far with Contour's own surrogate: k = 5 nearest tests, weight 1/(d + 0.001)², p(fail) = weighted share of failures.
- `FL.pixels` (scene 1 and 10): Adam's early pixel coder; see s01. Also a placeholder for now.

## Craft bar
- One idea on screen at a time; generous empty space; nothing overlaps unintentionally; nothing runs off-frame.
- Every element enters (`from`, draw-on, driver tween). No element appears fully formed. Mid-scene swaps (an element fading out to make room) are fine; the scene's last ~1.5 s must show a finished, composed frame (no exit at the end: the next scene crossfades over it). Only s10 fades to black.
- Vary eases (`power2/3`, `expo`, `sine`); no bounce/elastic/back. Avoid holds longer than ~3 s with nothing moving: a slow push, a highlight, a counter.
- Type: serif for statements and labels, `Plex Mono` for numbers, bits, code and data labels. Sizes: labels ≥ 32 px, data labels ≥ 24 px, footnotes 22 px (`.foot`). Prose on screen ≤ ~8 words at a time.
- Color has meaning: blue = true data / proposer, yellow = the guess / chosen path, green = pass / verifier, red = fail, purple = map. Grid lines and faint edges use `--faint`; text never uses `--faint`.
- Part scenes (4–9) show `K.strip` in the top-right corner with that part's roles (see your assignment).

## Check loop (repeat until it is right)
```bash
cd <project>/video
npx --yes hyperframes@0.9.13 lint
npx --yes hyperframes@0.9.13 snapshot --composition sNN --frames 10 -o .hyperframes/snap-sNN
```
Then Read `.hyperframes/snap-sNN/contact-sheet.jpg` (and single frames when you need detail). Use `--at` with root-timeline seconds (scene start + local time; starts are in `data/timing.js`) for exact moments. Look for: red "missing cue" text, overlaps, clipped text, empty or static stretches, wrong colors, anything that reads as generic. Fix and re-check. Finish with lint clean and a contact sheet you would show the author.

## Boundaries
- Edit only your own `compositions/sNN.html` files. Never edit `lib/`, `data/`, `index.html`, `tools/`, `../narration/` or another builder's scene. If a shared helper is missing, write it privately inside your IIFE; if you find a bug in a shared file, report it instead of fixing it.
- Do not run `npm install`, render the full video, or start a preview server.
- When done, report: what each scene shows (one line per beat), the cue words you used, anything you could not do, and any shared-file problem you found.
