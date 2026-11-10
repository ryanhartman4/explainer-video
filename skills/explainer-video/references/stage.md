# Stage: the film engine and its tools

`video/stage.js` draws the film; `tools/` time it, look at it, check it and render it. No dependencies beyond a
Chrome and ffmpeg. The worked example is `assets/demo/bloom/video/film.html` in this skill: read it before writing
a film, and copy from it.

Contents: the idea · a film file · when (paragraphs) · where (scenes) · things · animating · camera · text helpers ·
numbers, code, charts, canvas · sound hits · the tools · splitting a long film · traps

## The idea

**A film is a pure function of time.** Every animated value is a track: a base value plus keyframes "from time t,
go to v over dur". `film.seek(t)` evaluates every track at t and writes the page. So any frame can be drawn in any
order and is always the same, the order you write the code in does not matter (keyframes sort by time), and there
is no playback state to get wrong. Never use `Math.random()` (use `Stage.rng(seed)`), `Date`, timers or CSS
animations: they would make a frame depend on something other than t.

**Times come from words.** `p.at("fault lines")` is the second the narrator says those words. Never type a clock
time. Before the voice exists the clock is a placeholder at normal speaking pace; after recording, rerun
`node tools/clock.mjs` and every cue moves to the real word.

Coordinates are pixels on the 1920 by 1080 frame, origin top-left.

## A film file

```html
<link rel="stylesheet" href="stage.css">
<script src="data/timing.js"></script>
<script src="data/captions.js"></script>
<script src="stage.js"></script>
<script>
Stage.film({ look: "paper" }, film => {
  const [p1, p2, p3] = film.paras;                 // one per "## N." paragraph of SCRIPT.md
  const A = film.scene(p1, p2);                    // a picture that lives across paragraphs 1 and 2
  const title = A.text("Is this word\nin the set?", { x: 120, y: 120, size: "display" });
  const box = A.box({ x: 1300, y: 130, w: 340, h: 116, label: "heron" }).show(p1.at("this word"));
  title.hide(p2.at("To add a word", -0.25));
  box.to(p2.at("switched on"), { fill: "blue", color: "bg" });
});
</script>
```

Open `video/film.html` in a browser to play it: space plays, the bar scrubs, arrow keys step one frame (shift: one
second), `?t=12.4` opens at a time, `?look=slate` tries another look, `?captions=1` shows the burned-in captions.
The player uses `video/assets/audio/mix.wav` when it exists, so the user can judge sync by ear.

## When: paragraphs

| | |
|---|---|
| `film.paras` | the paragraphs in order; `film.para(3)` by number |
| `p.at("some words")` | when the phrase is spoken, 0.12 s early so the picture lands on the word |
| `p.at("words", -0.3)` | shifted by seconds |
| `p.at("the", { occ: 2, shift: 0.1 })` | the second time it is said |
| `p.after("some words")` | when the phrase has just been said |
| `p.start`, `p.end` | the paragraph's whole window |
| `p.voiceStart`, `p.voiceEnd` | first and last word |

A phrase must match the narration as spoken (case and punctuation ignored). Prefer two or three words: a phrase
names one moment where a single word may repeat. A phrase that is not found prints `missing cue` in red on the
frame, fails `check.mjs` and blocks `render.mjs`. Where SAY respells a term for the voice (`FLT4` spoken as
"F L T four"), cue on the words around it.

## Where: scenes and layers

| | |
|---|---|
| `film.scene(p)` | a layer that lives while paragraph p is spoken; it fades in over 0.4 s and out over 0.3 s |
| `film.scene(p2, p4)` | one layer across paragraphs 2 to 4: use this whenever the picture carries on |
| `scene.hud` | a layer on top that the scene's camera does not move: headings, counters |
| `film.front`, `film.back` | layers above and below every scene, for the whole film: a running head, a backdrop |

Things made on a scene exist only in that scene. A thing with no `show()` is there from the scene's first frame.
The first scene does not fade in: frame 0 is the thumbnail, so compose it as a poster. The last scene fades out.

## Things

Every creator works on a scene, on `scene.hud`, on `film.front`/`film.back`, and on a group. Each returns a node.
Common options: `x`, `y`, `opacity`, `scale`, `rotate`, `id` (a name for checker messages; give one to anything
you make in a loop), `z` (stacking), `overlap: true` (this is meant to sit on other things; the checker skips it).

| Creator | Options | Notes |
|---|---|---|
| `text("words", o)` | `size` display, title, head, body, label, note, or px · `font` display, text, mono · `color` · `w` wrap width · `align` left, center, right · `valign` top, middle, bottom · `weight` · `italic` | x, y is the top-left, or the edge or centre named by align and valign. `\n` breaks lines. Inline `<b>` `<i>` `<sub>` allowed. |
| `number(0, o)` | text options plus `decimals`, `prefix`, `suffix`, `fmt: v => string` | animate with `.to(t, { value: 9585 })` |
| `box(o)` | `w`, `h`, `fill`, `stroke`, `radius`, `lw`, `label`, `labelSize`, `labelFont`, `labelColor` | x, y is the top-left. With neither fill nor stroke given it is an ink outline. |
| `circle(o)` | `r`, `fill`, `stroke`, `lw`, `label`, ... | x, y is the centre |
| `line(o)` | `from: [x, y]`, `to: [x, y]`, `stroke`, `lw`, `dash: [8, 10]` | ends animate as `x1 y1 x2 y2` |
| `arrow(a, b, o)` | a and b are `[x, y]` or nodes · `bend` 0.2 curves it · `gap` · `fromSide`, `toSide` left, right, top, bottom · `head: false` | between nodes it runs edge to edge |
| `path("M..", o)` | `stroke`, `fill`, `lw`, `dash` | SVG path data in scene coordinates |
| `group(o)` | `x`, `y`, `w`, `h` | children are placed relative to it and move, fade and scale with it |
| `image(src, o)` | `w`, `h`, `radius` | a JPEG or PNG under `video/assets/`, about 1.5 times its display width |
| `code(src, o)` | `w`, `size`, `start` first line number, `title`, `numbers: false` | `.focus(t, 6, 8)` lights lines 6 to 8 and dims the rest; `.unfocus(t)`. A line holding only `…` marks elided lines. |
| `axes(o)` | `w`, `h`, `xr`, `yr`, `xticks`, `yticks`, `xlabel`, `ylabel`, `fmt` | `.plot(fn or [[x, y]..], o)`, `.dot(x, y, o)`, `.bar(x, v, o).grow(t)`, `.at(x, y)` gives scene coordinates |
| `canvas((ctx, t) => .., o)` | `w`, `h` | for hundreds of parts; draw only from t and `film.value()` tracks |
| `tex("\\frac{a}{b}", o)` | text options | needs `sh tools/add_katex.sh` (a download: ask first) |

Colours are look tokens (`ink`, `muted`, `faint`, `panel`, `bg`, `accent`, `blue`, `green`, `red`, `yellow`,
`purple`) or any CSS colour. Use tokens: the film then works in every look.

`node.box()` gives a node's resting `{ x, y, w, h }` and `node.center()` its centre, for placing things relative
to others. `Stage.cols(n, { x, w, gap })` gives n evenly spaced `{ x, w, cx }` cells.

## Animating

Every method takes the start time first and returns the node, so calls chain.

| | |
|---|---|
| `node.show(t, { by, dur, from })` | enter. `by`: `rise` (text default), `pop` (boxes, circles), `draw` (lines, arrows, paths; also boxes and circles), `fade`, `wipe` (left to right), `words` (text, word by word). `from: node` flies it in from that node. |
| `node.hide(t)` | leave, in 0.25 s. `show()` again later brings it back. |
| `node.to(t, { x: 600, fill: "blue" }, { dur, ease })` | go to these values from wherever they are. Any option the thing was created with: `x y scale rotate opacity w h r fill stroke color lw x1 y1 x2 y2 value label text`. Strings (a label, a text) switch at t. |
| `node.set(t, { .. })` | the same, instantly |
| `node.pulse(t)` | a short swell: look here |
| `node.dim(t)`, `node.undim(t)` | drop to 30% and back |
| `Stage.each(list, t, (node, t, i) => node.show(t))` | stagger a list 0.08 s apart; a fourth argument changes the gap |

Easings: `out` (entrances), `inOut` (moves, the default for `to`), `in` (exits), `linear` (steady progress),
`out5` (snappier), `sine`. `back` overshoots and is for a character's posture only.

Two `to()` calls on the same property are fine: the later one starts from wherever the earlier one has got to.

## Camera

`scene.camera.to(t, { x, y, zoom }, { dur })` centres the view on a point; `scene.camera.frame(t, node, { pad })`
fits a node or `{ x, y, w, h }`; `scene.camera.reset(t)` returns. The camera moves the scene's world, not its `hud`.
Zoom modestly (1.1 to 1.6) and come back out before the next beat.

## Text helpers

- `text.mark("phrase", t, { color, until })`: the phrase takes the accent colour and an underline draws under it.
  Use it for the key term at the moment the narrator says it.
- `text.strike("phrase", t)`: a line draws through it.
- `text.show(t, { by: "words", dur })`: the words appear one by one over dur, for a quotation read aloud.

## Sound hits

`film.hit("tick", t, { pitch: 3 })` on the line that schedules the picture event. Kinds: `tick`, `pluck` (both take
`pitch` 0 to 8), `pop`, `thock`, `thump`, `rise`, `chord`, `scratch`, `bell`. `tools/audio.sh` reads them from the
film and synthesizes each on its exact sample.

## The tools

Run all of them from the project folder.

| Command | Does |
|---|---|
| `node tools/doctor.mjs` | checks Node, ffmpeg, uv, headless Chrome and the engine files |
| `node tools/script_check.mjs --target 90` | lints SCRIPT.md: cue phrases exist, pacing, sentence length, length against the target |
| `node tools/clock.mjs` | SCRIPT.md + voice takes → `video/data/timing.js`, then the captions. Rerun after any change to the narration or the voice. |
| `node tools/shots.mjs [n]` | a contact sheet per paragraph in `shots/`, a frame at every beat, each labelled with the words being spoken |
| `node tools/shots.mjs --film` | twelve frames of the whole film |
| `node tools/shots.mjs --at 12.4,31` | full-size frames at those seconds; `--cue "3:fault lines"` for a phrase; `--look slate`; `--captions` |
| `node tools/check.mjs [--captions]` | the mechanical review; exit 1 on an ERROR |
| `sh tools/audio.sh` | voice post, clock, captions, hits, music, mix, loudness report, in the one safe order |
| `node tools/render.mjs` | `out/<project>.mp4`, 1080p30 with the mix. `--fps 60`, `--captions`, `--from 10 --to 20`, `--out`, `--look` |
| `node tools/captions.mjs` | `out/captions.srt` and the burned-in caption data (the clock runs it; run it alone after editing its `WRITE` list) |

Settings for the clock live in `film.config.json`: `lead` and `tail` (silence around each paragraph, 0.6 and 0.5),
`first` (opening frame before the first word, 0.8), `end` (after the last word, 3.0), `pad` (extra seconds before a
paragraph, `{ "3": 1.5 }`), `bpm` (voices start on the music's beats; `null` turns it off).

`check.mjs` reports ERROR for missing cues, script errors, fonts that failed, text off the frame, text on text, a
line through text, text under 24 px and text without contrast; WARN for stillness over 4.5 s under narration, blank
frames, an empty frame 0, sentences on screen, too many words, text shown too briefly to read, pile-ups of
entrances, text cut by a camera move and characters the bundled fonts lack. Fix every ERROR. For each WARN, fix it
or be able to say why it is right.

Rendering needs a Chrome that Playwright can drive. `tools/lib/browser.mjs` looks for `$STAGE_CHROME`, a Playwright
install, HyperFrames' cached Chrome, then Google Chrome, Chromium or Edge. In a project without Playwright, run
`npm install --save-dev playwright-core` (8 MB, no browser download; ask the user first).

## Splitting a long film

One `film.html` is right up to about three minutes. Past that, put each scene in its own file so several builders
can work at once: `video/scenes/a.js` holds `window.SCENES = window.SCENES || []; window.SCENES.push(film => { ... });`
and `film.html` loads the files in order, then calls `Stage.film({ look }, film => window.SCENES.forEach(f => f(film)))`.
Shared geometry and helpers go in one `video/shared.js` that one person owns.

## Traps

- **Fonts cover Latin only.** No `→ ← ≈ ≤ ≥`, no Greek. Draw arrows with `arrow()`, write "about", or use `tex()`.
  `×`, `÷`, `±`, `·`, `−`, `↑`, `↓`, curly quotes and dashes are fine. The checker warns on anything else.
- **Create things at their resting place.** `arrow(a, b)` between nodes reads their resting boxes when it is made;
  it does not follow a node that moves later. Animate the arrow's own ends (`x2`, `y2`) for that.
- **A scene's things die with the scene.** To keep a picture across paragraphs, span them: `film.scene(p2, p4)`.
  To bring a picture back later (the close), build it again in its final state with a small function, as the demo's
  `bitRow()` does.
- **Text inside a zoom:** headings and counters belong on `scene.hud`.
- **Loops need ids.** Sixteen boxes made in a loop should get `id: "bit" + i`, or checker messages cannot say which.
- **Do not edit `stage.js` for one film.** Put film-specific helpers at the top of `film.html`. `new_film.mjs --update`
  refreshes the engine and would overwrite your change.
- **`video/data/` is generated.** Never edit `timing.js`, `captions.js` or `hits.json` by hand.
