# One Sitting: notes for the next film

Made 2026-11-10 in one session. First `stage.js` film with a three.js layer, first built by parallel scene builders.

In this copy the 3D layer is the plugin's `video/stage3d.js`. The session wrote it as `video/shared.js`, with the
look in `video/look.css` (now the `night` look in `stage.css`); the notes below use the original names.

## What worked

- **three.js under `stage.js`, with no engine change.** `video/shared.js` renders one WebGL particle system to an
  offscreen canvas (`preserveDrawingBuffer: true`), and a `film.back.canvas()` node copies it in with `drawImage`.
  `shots.mjs`, `check.mjs` and `render.mjs` work unchanged. Headless Chrome drew 30,000 additive points at about
  20 frames a second across 6 pages on the M5.
- **One particle system for the whole film.** A sorted list of morph segments; frame t blends the form before and
  the form after, per point, with a staggered ease and a curved flight. Forms build lazily, so a heavy simulation
  costs nothing while other scenes are being shot. Live forms take a local clock, so the recap can replay them.
- **Camera and levels as `film.value()` tracks**, so camera moves show up as beats on the contact sheets.
- **`tail: 1.2` in `film.config.json`.** Each scene takes the points at `p.start - 0.8`. With the default tail of 0.5
  that is 0.3 s before the previous narrator stops. A longer tail fixed every join at once.
- **Splitting by paragraph** (`video/scenes/s0N.js`, each pushing `{ n, build }` onto `window.SCENES`, each wrapped in
  try/catch by `film.html`). Eight builders worked at once without breaking each other's frames. `video/BRIEF.md` is
  the contract they worked from.
- **Fact-check before recording.** Three checkers changed nine sentences. The worst: "No seed knows where its
  neighbours are" is true of Vogel's formula and false of the living plant; "every frame is a program I wrote today"
  claimed the engine and three.js.

## Traps

- `check.mjs` counts 2D nodes only, so it warns "the picture uses 2% of the frame" in every scene where the points
  are the picture. Those three warnings are expected here.
- `check.mjs` calls `toDataURL` on the 1080p canvas for its stillness test: about 40 s for a four-minute film.
- The builders' subagents share one scratchpad; files there get overwritten. Give each its own folder.
- A script change after the builders start costs a round: cue phrases break. Lock the script first when time allows.
- `tools/make_score.py` is this film's score (the plugin's instruments, a new nine-section arrangement keyed to the
  paragraph start times). `tools/audio.sh` calls it. To go back to the plugin's bed, point that line at
  `make_music.py`.
- `tools/wave.mjs` and `tools/session.mjs` must run after `sh tools/audio.sh` and before a render: scene 8 draws the
  mix's envelope and scenes 8 and 9 show the session's counts.

## Not verified

Nobody has listened. The voice (Breeze TTS 2, `w_mid.wav`) may misread a word; the score has never been heard.

## The X cut (captions burned in)

- Ten notes and credits sat below y 956, in the caption strip. Instead of moving each one, `film.html` raises the whole
  picture by `LIFT = 45` px when the page is opened with `?captions=1`: the 3D camera gets a view offset
  (`G3.lift` in `shared.js`) and the 2D scenes layer gets the same `translateY`, so labels stay on their points and
  the main cut is untouched.
- **Plugin bug worth folding back:** `tools/check.mjs --captions` narrowed the safe area but opened the film without
  `captions=1`, so it could not see a layout that depends on the flag. This project's copy now passes
  `captions: !!A.captions` to `openFilm`.
- `tools/captions.mjs` `WRITE` turns the spoken numbers back into digits (1963, 1972, 30,000, 10,000, 137.5 degrees).
- X plays at most 2:20 of video from accounts without Premium; this cut is 3:52.
