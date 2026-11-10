# Builder brief: "One Sitting"

A film of about four minutes, narrated in the first person by Claude, that shows what a language model can make in
one sitting. Every frame is code. **The anchor picture is 30,000 points of light** drawn by one WebGL particle system
(`G3`, in `video/stage3d.js`). Each paragraph of the narration rearranges the same points into the thing being talked
about. Labels, code and numbers sit on top in 2D, drawn by the plugin's `stage.js` engine.

You own **one file: `video/scenes/s0N.js`** for your paragraph N. Edit nothing else. If `stage3d.js`, `stage.js`,
`film.html`, `SCRIPT.md` or a tool is wrong, work around it in your file and say so in your report.

## Read first, in this order

1. `SCRIPT.md`: your paragraph's narration and beat sheet (your spec), and `## Sources` for the facts behind it.
2. `video/stage3d.js`: the header comment is the whole 3D API. Read the code of `G3.morph`, `G3.render`, the three
   built-in forms (`sphere`, `scatter`, `core`) and `G3.textForm`.
3. `video/scenes/s01.js`: the worked example. Copy its shape.
4. The engine's API: `/Users/ryanhartman/.claude/plugins/cache/explainer-video/explainer-video/9c4eab525b02/skills/explainer-video/references/stage.md`
5. The design method, sections 5 to 8 and 10: `/Users/ryanhartman/.claude/plugins/cache/explainer-video/explainer-video/9c4eab525b02/skills/explainer-video/references/method.md`

## File contract

```js
(window.SCENES = window.SCENES || []).push({ n: N, build(film, p, G3) {
  // p is your paragraph: p.at("spoken phrase"), p.start, p.end, p.voiceStart, p.voiceEnd
  // 1. G3.form(...) your shapes   2. G3.morph / G3.cam / G3.level on spoken phrases   3. const S = film.scene(p) and the 2D layer
} });
```

- **Every time comes from a spoken phrase** (`p.at("...")`, `p.after("...")`, `p.start`, `p.end`). Never type a clock
  time. The timing in `video/data/timing.js` is a placeholder; the real voice will move every word. A process that
  runs for a stretch (a simulation, a count, an orbit) maps the span between two cues, or a cue and `p.end`, onto its
  own clock: `clock: t => (t - tA) / (tB - tA) * SIM_SECONDS`.
- **Pure function of time.** No `Math.random()`, `Date`, timers, or state kept between frames. Use `G3.hash(i, salt)`
  or `Stage.rng(seed)`. Frames are drawn in any order. A live form's `update(tl, f)` must give the same points for
  the same `tl` whatever was drawn before. Simulate once inside the form's build function into typed arrays, then
  look the state up (interpolate between snapshots) in `update`.
- **Your window.** Schedule points, camera, level and grain from `p.start - 1.0` to `p.end`. Your first morph starts
  at about `p.start - 0.8`, so the points fly to your first form in the gap before your narration. The scene before
  you leaves the points in its own last form; the scene after you takes them from yours. Scene 1 ends on `scatter`.
- **Set the camera and levels yourself at your start**: `G3.cam.to(p.start - 0.8, { az, el, dist, look, fov: 40 }, { dur: 1.6 })`
  with every field given, and `G3.level.to(p.start - 0.8, 1, { dur: 0.8 })`, `G3.grain.to(p.start - 0.8, 1, { dur: 0.8 })`.
  Keep `az` between -0.9 and 0.9 unless the beat sheet calls for a full turn.
- **Form names** start with `sN-`, except the public forms listed under your scene below (scene 9 reuses them for its
  recap). A public form must look right with `G3.morph(t, name)` and nothing else: centred on the origin, facing the
  rest camera (az 0, el 0, dist 34), inside a box 30 wide and 16 high, and complete (a static snapshot, or a live form
  that looks finished at every local time from 0 up).
- **Ids.** Give every stage.js node an `id` that starts with `sN-`. Checker messages then name your scene.
- **Cost.** A form's build may take up to about 400 ms; `update` and any per-frame hook about 4 ms. Forms build the
  first time they are drawn, so a heavy simulation costs nothing while other scenes are being shot.
- **Extra THREE objects** (lines, a few meshes) go through `G3.add(obj, from, to, fn)` inside your window. Points are
  the film; use extras sparingly.

## Craft bar

- **The points are the star.** Each scene has one form a viewer would screenshot and one hero camera move (a push in,
  a pull back, a slow orbit). Let the form breathe: live forms move a little all the time.
- **The voice and the picture say the same thing at the same moment.** Build each row of your beat sheet as one block
  of code, on its cue phrase. A change every 2 to 5 seconds while the voice speaks. One change at a time.
- **Text must be readable.** 2D text never sits on dense bright points. Put the form to one side with `at: [x, y, z]`
  (a unit is 43.6 px at the origin with the rest camera; x = 8 is 349 px right of centre), or drop `G3.level` to about
  0.3 under a panel. Labels that follow 3D points are drawn with `G3.overlay` + `G3.text3` (they get a dark halo).
- **Layout.** Frame 1920 x 1080. Content inside x 120 to 1800, y 96 to 984. A paragraph heading is `S.hud.text(...,
  { x: 120, y: 96, size: "head" })`. The top-right corner (x 1500 to 1800, y 40 to 90) holds the running head: keep
  it clear. Results and verdicts land in the lower third. Eight words or fewer in any text on screen.
- **Type.** Sizes: display 144, title 96, head 64, body 44, label 34, note 26. Nothing under 26 px. At most three sizes
  in a frame. Fonts cover Latin only: no Greek, no arrows as characters (`×`, `÷`, `±`, `·`, `−`, `²`, curly quotes
  are fine). Canvas text drawn with `G3.text3` follows the same sizes.
- **Colour.** The look is `night` (the `night` look in `video/stage.css`). Tokens: `ink`, `muted`, `faint`, `panel`, `bg`, `accent`
  (coral: the one thing the frame is about), `blue`, `green`, `yellow`, `red`, `purple`. Points default to a cool
  white-to-blue dress with a few warm ones; recolour them with `G3.tint(f, i, "token", brightness)` when colour
  carries meaning. Give each hue one meaning in your scene and say it in a comment.
- **Real data.** Compute what is on screen. Where the narration makes a claim about the data, call
  `film.problem("...")` if the data stops matching. Where a picture is illustrative, a note on screen says so.
- **Motion.** Engine defaults are right: enter 0.5 s, exit 0.25 s, move 0.7 s. No bounce. A morph takes 1.2 to 2.2 s.
- **Sound.** `film.hit(kind, t)` on the line that schedules the picture event; fewer than one every three seconds.
  Kinds: bell, tick (pitch 0..8), chord, rise, pop, pluck (pitch 0..8), scratch, thock. `thump` belongs to scene 6.
- **Prose on screen** is plain: short words, no em-dashes, no "X, not Y" constructions.

## Check loop (run from the project root, `/Users/ryanhartman/Movies/one-sitting`)

```
node tools/shots.mjs N            # contact sheet of your paragraph -> shots/p0N.jpg  (open it and LOOK)
node tools/shots.mjs --at 61.2,64 # full-size frames at those seconds -> shots/at-61.20.jpg (read small text here)
node tools/check.mjs              # the mechanical review, whole film: fix what it says about ids starting sN-
```

Build one beat at a time, shoot, look, fix. Other builders are editing other scene files at the same moment, so the
film may show red problem text that names another scene, and frames outside your paragraph may look broken: ignore
both. Red text naming your scene is yours. `missing cue` means a phrase does not match the narration as written.
Before you report: every row of your beat sheet is on screen on its words; the contact sheet tells your paragraph
without sound; no text is cut off, overlapped or under 26 px; `check.mjs` has no ERROR for your ids.

## Report back

What you built, where you departed from the beat sheet and why, any fact in the script you could not make true on
screen, and any shared-file problem you hit. Under 200 words.

## Scene notes

**2. Words become geometry.** Public form: `clusters` (the labelled word clusters, final state, static or gently
live). The word "king" is spelt by the points (`G3.textForm`), then collapses to one bright point while the rest
become a faint cloud; three axes are drawn through it (extras or `G3.line3`); then the cloud gathers into four or
five clusters. Place about 16 words by hand as 3D positions (animals, cities, royalty, people, with man, woman, king,
queen placed so that queen − king points close to, but not exactly, the same way as woman − man: about 12 degrees apart); each word is a small dense knot of points
with a `G3.text3` label that follows the slow orbit. The two arrows (`G3.line3` with `head`) are the accent. A note
says "illustration: positions placed by hand" and stays up while the arrows are shown. Credit on screen: "word2vec, Mikolov et al. 2013". The vector beside
"king" is illustrative numbers in mono with a trailing "…" replaced by "..." (Latin only).

**3. One word at a time.** The points form five or six stacked horizontal sheets (the layers of a network), seen from
slightly above, dimmed and placed in the upper two thirds. The word tiles are stage.js boxes in a row across the
lower third: "Every", "frame", "is", "drawn", "by", then an empty tile. Arcs are stage.js `arrow`s with `bend`, or paths, from
the empty tile back to each earlier word, with line width as the weight ("frame" and "is" heaviest). The four
candidate bars: code, hand, light, potato, with scores that sum to under 1 and a note "illustrative scores".
"code" moves into the empty tile (`show(t, { from })` or `to`). Then the tiles for ", and I wrote these scenes today" tick
in one at a time, each with a `tick` hit. The final beat sends a wave of brightness up through the sheets (a live
form: `update` brightens points by height and time).

**4. Three equations.** Public form: `lorenz` (the attractor filled with points, static or flowing, centred and
scaled to fit the box above; the classic view shows both wings). Integrate dx/dt = 10(y − x), dy/dt = x(28 − z) − y,
dz/dt = xy − (8/3)z with RK4. The points stream along the solution (each point sits at its own phase along one long
precomputed trajectory, advancing with local time). Equations in mono on the left, written with numbers, no Greek.
The two markers start 0.000001 apart in x; integrate both, map the span from "two points" to "opposite wings" onto
enough simulated time that they end on opposite wings (x of opposite sign), and call `film.problem` if they do not.
The gap readout is the real distance between the two solutions at that simulated time. Markers are drawn in the
overlay (`G3.dot3`) with short trails; one is `accent`, one is `blue`. Dim the other points with `G3.level` while the
markers are the subject. The closing line on screen: "almost the same start, different futures".

**5. Find the bug.** Public form: `tests` (the 100 × 100 grid of 10,000 test dots in its final all-passing state; the
other 20,000 points form a faint frame or dust around it). Code panel on the left (stage.js `code()`), grid on the
right (`at` about x = 9). The function, in JavaScript, 9 or 10 lines: `let lo = 0, hi = a.length - 1; while (lo < hi)
{ const mid = (lo + hi) >> 1; if (a[mid] === x) return mid; if (a[mid] < x) lo = mid + 1; else hi = mid - 1; } return
-1;`. Run both versions at load on 10,000 seeded random tests (sorted arrays of distinct integers, length 1 to 40,
the wanted item always present). Each grid dot is one test: red where the buggy version fails, green where it passes.
Show the real failure count. On "One character" the condition becomes `<=` (a second code panel state, or a text
overlay on the line, the "=" in accent). On "all ten thousand pass" the red dots turn green in a wave across the
grid. `film.problem` unless the fixed version passes 10,000 of 10,000 and the buggy one fails between 4,000 and 5,000 (the narration says "nearly half failed"). The note on screen: "run by the film's own code, at every render". The
five-cell example shows a real failing case from the tests (smallest array that fails), the cells the search ruled out dimmed, and the one last cell it stopped on without checking (the wanted item)
outlined in accent.

**6. One law.** Public form: `galaxy` (two galaxies after the pass, tails out, a static snapshot or slowly live).
A restricted N-body run: two softened point-mass cores on a bound or parabolic orbit about their centre of mass
(integrate with leapfrog), each with a disc of massless stars on circular orbits (15,000 each, exponential radial
profile, discs tilted differently, one prograde). Precompute snapshots (for example 160 steps of positions as
Float32Array), interpolate in `update`. Map the paragraph onto the run so the closest pass lands near "those long
tails" and the tails are long by "real galaxies wear". Tint one galaxy cool and one warm so the viewer can follow
whose stars are whose. Camera: start close on the two discs, pull back and tilt as the tails grow. The formula on
screen is `F = G m M / r²`. The two pull lines run from one marked star to both cores (`G3.line3`). One `thump` at
the closest pass. Credit: "Toomre and Toomre, 1972". Note: "as in the Antennae galaxies".

**7. Only because it is beautiful.** Public form: `flower` (the open three-dimensional flower, final state, gently
live). Seed n sits at angle n × 137.508 degrees and radius c × sqrt(n) (Vogel 1979). First the points fall into the
`core`; then the first dozen seeds appear one at a time with the turn drawn as an arc and the angle readout counting
to 137.5; then all 30,000 grow outward into the full flat head, seen face on. Zoom in until the crossing spirals fill
the frame, then pull back while the flat head curls into a bowl and opens as a flower in 3D (radius-dependent lift,
outer seeds as petals; colour runs from warm at the centre to cool at the rim), the camera tilting to see it in
depth. The poem's three lines land in the lower third, left-aligned, display face, one per cue: "Thirty thousand
lights." / "None of them knows the picture." / "Still, the flower blooms." No heading in this scene. The credit "Vogel, 1979" appears as a note when the sunflower appears.

**8. How this film was made.** Uses `window.SESSION` (`builders`, `reviewers`, `lines`, `frames`; real values are
written before the final render) and `window.WAVE` (`peaks`: an array of 0..1 loudness values across the whole film,
`total`: seconds; it is empty until the audio is mixed, so while `WAVE.peaks.length === 0` build a stand-in envelope
from the word timings in `film.paras` and do not call `film.problem`). The ball splits into one cluster per scene
(nine, labelled with the scene titles in `film.paras[i].title`, laid out on a ring or a 3 × 3 grid); progress rings
are drawn in the overlay. Builder and reviewer counts come from `SESSION`. Then the points line up as the waveform of
the whole film: x across the frame is film time 0 to `film.duration`, height is loudness, mirrored about a centre
line. Points whose time falls inside a spoken word (from `film.paras[..].words`, times relative to `voiceStart`) are
the voice, tinted `accent`; the rest are music, tinted `blue`. Labels: "voice: speech model, run locally",
"music: a score script, written today". Credit note at "own soundtrack": "built on three.js, the explainer-video engine, Breeze TTS 2". The now dot is drawn in the overlay at x = film time t, and it moves.

**9. What next.** Reuses the public forms `clusters`, `lorenz`, `tests`, `galaxy`, `flower` (built by scenes 2, 4, 5,
6, 7; until those files exist the film prints "no form called ..." and falls back to the sphere, which is expected).
The five recap morphs land on the five verbs, each about 0.55 s (`dur: 0.5, stagger: 0.2, swirl: 0.3`). Stats in a
row across the lower third: "0 cameras", "1 sitting", then "lines written today" and "frames" counting up from `SESSION`. The
last form is the question "What should we make next?" spelt by the points (`G3.textForm`, two lines if needed, width
about 34), with the credit "made by Claude, in one sitting" in 2D under it, a smaller note "built on three.js, the explainer-video engine, Breeze TTS 2", and a `bell`. The film ends on that frame:
hold it still, apart from a slow push in, for the last three seconds.

## Changes since the build began (13:40)

The narration was fact-checked and a few sentences changed. If your frames show `missing cue`, re-read your
paragraph in SCRIPT.md and use the phrase as it is written now. Changed cues: scene 1 "drawn by code"; scene 7 "a
seed's neighbours" (was "where its neighbours are"); scene 8 "copies of myself" (was "a copy of myself"). The beat
sheets and the scene notes above carry the other changes (credits, labels, the tile words in scene 3).
