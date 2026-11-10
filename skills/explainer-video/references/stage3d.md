# Stage 3D: a point layer under the stage

`video/stage3d.js` adds one WebGL particle system to a `stage.js` film: 30,000 points of light drawn under every
scene, an orbit camera, ready-made forms for the points to take, and helpers for 2D labels that follow 3D points.
It needs three.js (`video/three.min.js`), which `new_film.mjs --3d` copies in. Everything in `references/stage.md`
still applies: the tools, the cues, the 2D things. Worked examples: `assets/demo/one-sitting/` (a 3:52 film, nine
scenes) and `assets/demo/forms3d/` (a gallery of the ready-made forms).

Contents: when to use it · set-up · the idea · the API · forms · the camera · labels on 3D points · text beside the
points · the ready-made forms · the handoff between scenes · a long film, built in parallel · the captioned cut ·
the vertical cut · design notes · rendering · traps

## When to use it

Use it when the subject is a shape, a space, a simulation or a crowd of things: an attractor, a galaxy, word
vectors, ten thousand tests, a waveform. And when the film is a showcase and should feel like one. The points are
then the anchor picture of `references/method.md`: one set of points for the whole film, rearranged into each
subject. A change of subject is a flight of the same points, never a cut.

Do not use it to decorate a film whose picture is a diagram, a chart or code. A 2D film with drifting particles
behind it is the "screensaver" failure of the method. A character still needs the back-up engine (`SKILL.md`).

## Set-up

```bash
node <skill>/scripts/new_film.mjs <project-folder> --3d
```

This adds `video/stage3d.js`, `video/three.min.js`, the forms in `video/forms3d/`, and a 3D `video/film.html` to
start from. `node tools/doctor.mjs` then also checks that the headless Chrome has WebGL. `--update` refreshes the
3D files in a project that has them. The look is `night` (in `stage.css`); `slate` and `chalk` also work. The points
are additive light, so a light look such as `paper` does not work, and the film says so.

## The idea

**One particle system, many forms.** A form is a shape for all N points: a position, a colour and a size for each.
`G3.morph(t, "name")` says: from time t the points fly to that form. Frame t is drawn from scratch: find the latest
morph that has started, take the points where the form before it has them, and move each one toward the new form
along a curved path, each leaving at its own moment. No state is kept between frames, so frames can be drawn in any
order, exactly as in `stage.js`.

**A form may be alive.** Its build function can return `update(tl, f)`, which moves the points as the form's local
time `tl` runs (seconds since its morph began, or whatever the morph's `clock` returns). A simulation is run once,
inside build, into typed arrays; `update` looks the state up.

**Times come from words**, as everywhere: `G3.morph(p.at("his butterfly"), "lorenz")`.

## A film file

```html
<script src="three.min.js"></script>
<script src="stage.js"></script>
<script src="stage3d.js"></script>
<script src="forms3d/lorenz.js"></script>
<script>
Stage.film({ look: "night" }, film => {
  G3.init(film, { captionLift: 45 });
  const [p1, p2] = film.paras;
  G3.form("title", G3.textForm("Three equations", { width: 30 }));
  G3.form("butterfly", G3.lib.lorenz());
  G3.morph(0, "title", { at: [0, 2, 0] });                       // frame 0: the points spell the title
  G3.morph(p1.at("his butterfly"), "butterfly", { dur: 2 });      // the same points become the attractor
  G3.cam.to(p1.at("his butterfly"), { az: 0.4, el: 0.15, dist: 30 }, { dur: 6 });
  const S = film.scene(p1, { fadeOut: 1.2 });
  S.hud.text("Three equations", { x: 120, y: 96, size: "head" }).show(p1.at("his butterfly"));
});
</script>
```

## The API

| | |
|---|---|
| `G3.init(film, { points, captionLift })` | the first line of the film. `points`: how many (30,000). `captionLift`: pixels the picture rises in the captioned cut (45 suits most films; see below). |
| `G3.form(name, build)` | register a form. `build(f, N)` fills `f.pos` (x, y, z per point, world units), `f.col` (r, g, b from 0 to 1) and `f.size` (1 is normal). It runs once, the first time the form is drawn. It may return `update(tl, f)`. |
| `G3.morph(t, name, opts)` | from t the points fly to the form. `dur` (1.6), `at: [x, y, z]`, `scale`, `rx`, `ry` (tilt, radians), `spin` (radians a second about y), `swirl` (0.6: how much the flight curves), `stagger` (0.45: how spread out the departures are), `bloom` (0.5: how much points swell in flight; 0 for a small step), `clock: t => local time`. Returns the segment; `seg.world([x, y, z], t)` turns a form position into a world position. |
| `G3.cam.to(t, { az, el, dist, look, fov }, { dur, ease })` | the orbit camera. `az`, `el`: angles in radians around `look: [x, y, z]`; `dist`: distance. `G3.cam.at(t)` reads it. |
| `G3.level.to(t, v, { dur })` | brightness of all points: 1 is full, 0.3 sits behind a panel |
| `G3.grain.to(t, v, { dur })` | size of all points: 1 is normal |
| `G3.textForm(text, opts)` | a build function: the points spell the text. `width` (world units), `font` (display, text, mono), `weight`, `depth`, `lineGap`, `align`, `color`. `\n` breaks lines. |
| `G3.project([x, y, z], t)` | where a world point is on the frame at t: `{ x, y, z, ok }` |
| `G3.pxPerUnit([x, y, z], t)` | pixels per world unit at that point |
| `G3.overlay(scene, (ctx, t) => ..., { id })` | a 2D canvas over the points, in a `stage.js` scene |
| `G3.text3(ctx, t, "label", p, opts)` | text at a world point: `size`, `color`, `dx`, `dy`, `align`, `alpha`, `font`, `weight`, `halo` |
| `G3.line3(ctx, t, a, b, opts)` | a line between two world points: `color`, `lw`, `alpha`, `draw` (0 to 1 grows it), `dash`, `head` |
| `G3.dot3(ctx, t, p, opts)` | a dot or a ring at a world point: `color`, `r`, `alpha`, `ring`, `lw` |
| `G3.add(obj, from, to, fn)` | a THREE object in the world, visible from..to; `fn(t, k)` runs each frame it is visible |
| `G3.onFrame(fn)` | `fn(t)` before every frame |
| `G3.rgb("blue")`, `G3.css("blue")`, `G3.tint(f, i, "blue", k)` | look colours for points and canvas drawing |
| `G3.hash(i, salt)` | 0 to 1, the same every time: the only randomness allowed |
| `G3.fade(t, a, b, d)`, `G3.ease`, `G3.smooth(a, b, x)`, `G3.clamp`, `G3.lerp` | small helpers |
| `G3.N`, `G3.DIR` | the point count; a fixed unit vector per point (x, y, z), for forms that need a direction |

Built-in forms: `"globe"` (a turning ringed globe, a good resting state; also registered as `"sphere"`),
`"scatter"` (a wide drifting cloud; `scale: 0.5` keeps it inside the frame) and `"core"` (every point in one small
ball).

## Writing a form

```js
G3.form("ring", (f, N) => {
  for (let i = 0; i < N; i++) {
    const a = i / N * 6.2832, r = 8 + 0.6 * (G3.hash(i, 1) - 0.5);
    f.pos[i * 3] = Math.cos(a) * r; f.pos[i * 3 + 1] = Math.sin(a) * r; f.pos[i * 3 + 2] = (G3.hash(i, 2) - 0.5) * 0.4;
    f.size[i] = 0.7 + 0.6 * G3.hash(i, 3);
    if (i % 12 === 0) G3.tint(f, i, "accent");
  }
  return (tl, f) => { /* optional: move the points with local time tl */ };
});
```

- **Fit the frame.** At the rest camera (`az` 0, `el` 0, `dist` 34, `fov` 40) the frame shows 44 by 24.7 world units
  at the origin: 43.6 px a unit. A form that fills a box 30 wide and 16 high, centred on the origin, sits well.
- **Use every point.** All N points belong to every form. Points a form has no use for become its dust, its frame
  or its haze, small and dim. A form that parks spare points off screen makes the next flight look wrong.
- **Colour.** `f.col` starts in the default dress: cool white to blue, one point in twelve warm. Recolour with
  `G3.tint` only where colour carries meaning. Keep each channel at 1 or under: the points add, and dense bright
  points burn to white.
- **Size** carries brightness too. 0.5 to 1.3 is the normal range; a few points at 2 to 3 read as stars.
- **Alive, a little.** A form that holds for more than a second or two should move: a slow turn, a breath of 2
  percent. A frozen frame under narration reads as a stall.
- **Pure function of local time.** `update(tl, f)` gives the same points for the same `tl`. No `Math.random()`,
  `Date` or timers. Simulate once in build (leapfrog, RK4), store snapshots (Int16 or Float32), and interpolate.
- **Cost.** Build up to about 400 ms; `update` about 4 ms. Build runs lazily, so a heavy form costs nothing until
  the film reaches it.
- **A process over a stretch of narration** gets a clock:
  `G3.morph(t0, "run", { clock: t => (t - tA) / (tB - tA) * RUN_SECONDS })`.

## The camera

One hero move per scene: a push in, a pull back, or a slow orbit. Set every field when a scene begins
(`G3.cam.to(t0, { az, el, dist, look, fov: 40 }, { dur: 1.6 })`), because the scene before left the camera wherever
it liked. Keep `az` between -0.9 and 0.9 unless the beat calls for a full turn. Let the camera drift slowly through
a hold (`ease: "linear"` or `"sine"` over the whole stretch) so no frame is frozen.

## Labels on 3D points

Labels, arrows and markers that must follow the points are drawn in an overlay, a `stage.js` canvas node that
belongs to a scene and fades with it:

```js
G3.overlay(S, (ctx, t) => {
  const a = G3.fade(t, tIn, tOut);
  G3.text3(ctx, t, "queen", seg.world(queen, t), { size: 34, dx: 64, dy: 0, align: "left", alpha: a });
  G3.line3(ctx, t, seg.world(man, t), seg.world(woman, t), { color: "accent", lw: 4, head: true, draw: G3.ease(G3.clamp((t - tArrow) / 0.8)) });
}, { id: "labels" });
```

Canvas text follows the same rules as any text (`references/method.md`): 26 px or more, eight words or fewer, the
look's tokens. `check.mjs` cannot see text drawn in a canvas, so look at those frames yourself.

## Text beside the points

2D text never sits on dense bright points. Either move the form aside with `at: [x, y, z]` (x = 8 is 349 px right
of centre at the rest camera) and give the text the other half, or drop `G3.level` to about 0.3 under a panel.
Results, verdicts and stats go in the lower third, as in any film.

## The ready-made forms

Each is one file in `video/forms3d/`. Load the file, then `G3.form("mine", G3.lib.<name>({ ... }))`. Every option
has a default, so `G3.lib.<name>()` alone shows a finished, good-looking form. The header comment of each file is
its full documentation: options, the anchors for labels, what local time does, the size, the source. The gallery
film `assets/demo/forms3d/` shows them all and is their test.

| File | Call | The points become | The film drives it with | For labels and markers |
|---|---|---|---|---|
| `clusters.js` | `G3.lib.clusters({ groups, highlight, dim })` | labelled knots in hued groups, each group in a faint haze: words, nodes of a graph, categories | `dim`: a number or a function of local time that dims every knot outside `highlight` | `cl.items`, `cl.groups`, `cl.pos(k)`, and `cl.link(a, b, seg, t)`: the two ends of an arrow that clears both knots |
| `sheets.js` | `G3.lib.sheets({ layers, cols, rows })` | a stack of rippling lattice sheets with bright unit knots and motes climbing between them: the layers of a network, a tech stack, strata | `sheets.pulse(at, { dur, hold })`: a pass of light up the stack at a local time; `hold: true` leaves it lit | `layer(k, tl)`, `side(k, "right", tl)`, `unit(k, c, r, tl)`, `corners(tl)` |
| `lorenz.js` | `G3.lib.lorenz({ sigma, rho, beta, flow, speed, fall })` | points streaming along a solution of the Lorenz equations, or of any 3D flow passed as `flow` (RK4, integrated in the form) | `fall`: seconds for a cloud of starting states to fall onto the attractor; `speed` | `L.path(x0, y0, z0)` returns `at(simTime)` for a solution of your own (two markers that drift apart), `L.gap(a, b)`, `L.wings` |
| `grid.js` | `G3.lib.grid({ cols, rows, states, to, colors, reveal, flip })` | a grid of cells, one per unit of something (a test, a pixel, a day), coloured by state; spare points are the frame and dust | `reveal` and `flip`: a number, a `[from, to]` pair of local times, or a function. A scan reveals the cells; a wave moves them from `states` to `to` | `count(state, tl)` (exact, matches the picture), `cell(k, tl)`, `corners` |
| `galaxies.js` | `G3.lib.galaxies({ eccentricity, pericentre, massRatio, tilts, still })` | two discs of stars that pass on a Kepler orbit and throw out tidal tails: a restricted N-body run | local time is the run: `duration` 14 s, closest pass at `tPass` 7.2 s. Map narration onto it with the morph's `clock`. `still` freezes it | `cores(tl)`, `star(i, tl)`, `tailStar(g)`, `pull(i, tl)`, `check()` (did the pass happen, how many stars end in tails) |
| `phyllotaxis.js` | `G3.lib.phyllotaxis({ angle, play, placed, grow, curl, open, petals })` | a seed head grown by Vogel's rule (seed n at n times the angle, radius by the square root of n) that curls into a bowl and opens as a flower. With no options: the open flower | `play: true` runs the default timeline; or give `placed`, `grow`, `curl`, `open` as numbers or functions of local time. `build.clock([[filmTime, localTime], ...])` lands stages on words | `seed(n, tl)`, `stage(tl)`, `radius`, `tFull`, `tOpen` |
| `waveform.js` | `G3.lib.waveform({ peaks, total, spans, window, zoom, colors })` | a series over time as a mirrored band: a soundtrack's loudness (`tools/wave.mjs` writes the peaks), a signal, a day's activity. `spans` take the first colour | local time is "now" in the series. `window`: seconds in view; `zoom`: 0 to 1 out to the whole series | `x(time, tl)`, `at(time, tl, v)`, `top`, `bottom` |

Each form sizes and brightens its points for the point count, so it reads the same at 12,000 and at 60,000 points.
Keep the form in a variable when you need its anchors: `const L = G3.lib.lorenz(); G3.form("mine", L);`. Anchors are
in form coordinates: pass them through `seg.world(p, t)`, where `seg` is what `G3.morph` returned.

A film often needs a form the shelf lacks. Write it in the scene file with `G3.form`; if it is general, give it
options and a header and add it to `video/forms3d/`, then to the gallery.

## The handoff between scenes

- A scene takes the points at `t0 = p.start - 0.8`, so they fly to its first form in the gap before its narration.
- Set `"tail": 1.2` in `film.config.json`. With the default tail of 0.5, `p.start - 0.8` is 0.3 s before the last
  narrator stops, and the picture leaves under their final word.
- At `t0` a scene also sets the whole camera, `G3.level` and `G3.grain`.
- 2D text leaves with the points under it: `film.scene(p, { fadeOut: 1.2 })`. Overlay labels fade the same way
  (multiply their alpha by `1 - G3.smooth(p.end - 0.8, p.end - 0.35, t)`).
- A morph may start before the last one lands; the points are taken from where they are. But a flight cut short
  reads as a jolt: end the last morph of a scene by `p.end - 0.8`
  (`dur: Math.min(2.4, p.end - 0.8 - t)`).

## A long film, built in parallel

Past about three minutes, give each paragraph its own file, `video/scenes/sNN.js`, so several builders can work at
once and one broken scene does not stop the others (`references/stage.md`, "Splitting a long film"). With the 3D
layer the points pass from scene to scene, so the contract needs a few more lines. `assets/demo/one-sitting/video/BRIEF.md`
is the brief that eight builders worked from; copy it and change the scene notes. The order that worked:

1. The lead writes and fact-checks the script, builds the first scene as the worked example, shoots it, and writes
   the brief. Voice recording starts as soon as the script is locked.
2. One builder per scene file, all at once. Each builds its beat sheet, shoots its contact sheet and looks at it.
3. A fresh reviewer per scene looks at the frames only and lists findings with times and concrete fixes. A fixer
   per scene applies them. (Builder, critic and fixer are three different contexts on purpose.)
4. On the real voice, four reviewers look at the whole film through one lens each: the joins between scenes, every
   word on screen, sync against the beat sheets, and motion (short silent renders tiled at 10 to 30 frames a second,
   which is the only way to see a jolt or a flash). The lead applies what is clearly right.

What each reviewer caught on "One Sitting" is in `references/playbook.md`, "Film 7".

## The captioned cut

Captions sit in a strip from y 968 down, and `check.mjs --captions` keeps text out of y 956 and below. A 3D film's
notes and credits often sit lower than that. `G3.init(film, { captionLift: 45 })` handles it without moving
anything by hand: when the film is opened with `?captions=1` (which `render.mjs --captions`, `shots.mjs --captions`
and `check.mjs --captions` all do), the 3D camera and the 2D scenes rise together by that many pixels, so labels
stay on their points. The main cut is untouched. Make sure nothing in the main cut sits above y 40 + the lift.

## The vertical cut

A film with a vertical cut has a second file, `video/film-9x16.html`, composed for the 1080 by 1920 frame
(`references/stage.md` and `references/method.md` section 13). The 3D layer draws in whichever frame its file
declares. `new_film.mjs <project> --3d --vertical` starts the tall file with the layer already loaded; in a project
that has a 2D tall file, add the `three.min.js` and `stage3d.js` script tags after `stage.js` and call `G3.init`.

- The rest camera stands further back in the tall frame (`dist` 76): it shows 31 by 55 world units, 34.9 px a unit,
  so a form 30 units wide still fills the width. Forms, morphs and clocks are the same as in `film.html`.
- Compose it afresh, as the method says. The points usually take the upper two thirds (`at: [0, 10, 0]`), with text
  under them inside x 72 to 1008, y 200 to 1400.
- Leave `captionLift` out of the tall file: its captions sit below where its text may go.
- Shoot and check it with `--format 9x16`.

## Design notes

- **The method still rules.** One change at a time, on the word that causes it. A morph is a beat. The voice and
  the points say the same thing at the same moment.
- **Compute what the points show.** Integrate the equations, run the tests, simulate the gravity, in the film.
  Where the narration makes a claim about that data ("they end on opposite wings", "nearly half failed"), call
  `film.problem` when the data stops agreeing. Where a layout is placed by hand, a note on screen says
  "illustration".
- **Credit on screen.** A borrowed model or method gets a small muted note when it appears ("Lorenz, 1963").
- **One meaning per hue per scene**, with the accent for the one thing the frame is about.
- **What the mechanical checker cannot see:** text drawn in a canvas, points behind text, a jolt between frames.
  It also cannot hear. Look at the frames; render and tile a clip to judge motion.

## Rendering

Headless Chrome draws the points with its software WebGL (SwiftShader) at about 20 frames a second across six
pages on an M5: a four-minute film renders in about four minutes. Points are noise to a video encoder: at the
default `--crf 16` a four-minute film is about 280 MB, at `--crf 18` about 230 MB. For a small copy to send:

```bash
ffmpeg -i out/film.mp4 -vf scale=1280:720 -c:v libx264 -preset slow -b:v 880k -maxrate 1300k -bufsize 2600k -c:a aac -b:a 112k -movflags +faststart out/film-720p.mp4
```

## Traps

- **`G3.init(film)` comes first**, before any `G3.form` that reads a look colour and before any scene.
- **The first morph is at 0.** Frame 0 is the thumbnail; with no morph scheduled the film reports a problem.
- **`check.mjs` measures 2D nodes only.** With the 3D layer on it skips its "small content in a big frame"
  warning; judging how well the points fill the frame is yours.
- **Dense points burn white.** Ten thousand size-3 points in a small square fuse into a slab. Lower `G3.level`
  and `G3.grain` for that stretch, or shrink the points.
- **A form used twice** (a recap) is evaluated at each morph's own local time. Give the second morph a `clock`
  that returns a time at which the form looks finished.
- **Do not edit `stage3d.js` for one film.** `new_film.mjs --update` refreshes it. Film-specific forms and helpers
  go in the film.
