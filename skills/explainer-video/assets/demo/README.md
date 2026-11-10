# The worked examples

Three films: `bloom/` (2D, one file), `one-sitting/` (3D, nine scene files, built by parallel agents) and
`forms3d/` (a gallery of the ready-made 3D forms).

## Bloom

`bloom/` is a finished film made with this skill's method and engine: "How a Bloom filter works", 93 seconds,
6 paragraphs, 33 beats, the `paper` look. Read it in this order:

1. `bloom/SCRIPT.md`: the takeaway, the viewer, the question ladder, then each paragraph's narration with its beat
   sheet, and the sources.
2. `bloom/DESIGN.md`: the anchor picture with coordinates, the look, what each colour means.
3. `bloom/video/film.html`: the film. Each beat of the script is one block of code. The data on screen is computed
   in the file, and the film refuses to build if the narration's claims stop matching it.

To run it, make a project and copy the example over the template's files:

```bash
node <skill>/scripts/new_film.mjs /path/to/bloom-demo
```

```bash
cp -R <skill>/assets/demo/bloom/. /path/to/bloom-demo/
```

```bash
cd /path/to/bloom-demo && node tools/doctor.mjs
```

If the doctor says Playwright is missing, install it in the project (8 MB, no browser download; ask the user first)
and run the doctor again until it prints `Ready.`:

```bash
npm install --save-dev playwright-core
```

```bash
node tools/clock.mjs && node tools/check.mjs --captions && node tools/shots.mjs --film
```

Then open `video/film.html` in a browser, or `sh tools/audio.sh && node tools/render.mjs` for an MP4 (music and
sound hits only until a voice is recorded: step 6 of the skill).

## One Sitting

`one-sitting/` is a finished 3:52 film on the 3D point layer (`references/stage3d.md`): 30,000 points of light
become word clusters, a network, the Lorenz attractor, 10,000 real tests, colliding galaxies, a sunflower and the
film's own waveform. Read it in this order:

1. `one-sitting/SCRIPT.md`: nine paragraphs with beat sheets and sources. The fact-check's changes are in
   `references/playbook.md`, "Accuracy", marked *(film 7)*.
2. `one-sitting/DESIGN.md`: the points as the anchor picture, the `night` look, what each colour means.
3. `one-sitting/video/BRIEF.md`: the brief eight parallel builders worked from. Copy it for the next long film.
4. `one-sitting/video/scenes/s01.js` (the exemplar the lead built), then any other scene: forms, morphs and camera
   on spoken phrases, then the 2D layer. `s04.js` (Lorenz), `s05.js` (tests run at load) and `s06.js` (a restricted
   N-body run) compute what they show and call `film.problem` when the narration's claims stop matching.
5. `one-sitting/NOTES.md`: what worked, the traps, and what nobody has verified.

Its tools add to the template's: `tools/make_score.py` (a score arranged for this film's nine paragraphs, on the
template's instruments; `tools/audio.sh` calls it) and `tools/session.mjs` (the session's counts, for scenes 8 and
9). Scene 8 draws the mix's loudness envelope, which the template's `tools/wave.mjs` writes. To run it:

```bash
node <skill>/scripts/new_film.mjs /path/to/one-sitting --3d
```

```bash
cp -R <skill>/assets/demo/one-sitting/. /path/to/one-sitting/
```

```bash
cd /path/to/one-sitting && node tools/doctor.mjs && node tools/clock.mjs && node tools/session.mjs --builders 8 --reviewers 15 --lines 1576
```

```bash
node tools/check.mjs && node tools/shots.mjs --film
```

The counts in the third command are the original session's record (the 1,576 lines include the 3D layer, which is
now the plugin's `stage3d.js`). After a voice is recorded: `sh tools/audio.sh && node tools/wave.mjs`, then the
`session.mjs` line again, then `node tools/render.mjs --crf 18`.

## The forms gallery

`forms3d/` is a short film with one paragraph per ready-made form in `assets/stage3d/forms3d/`: each scene file in
`forms3d/video/scenes/` uses only its form's public options and anchors, so it is both the visual catalog and the
forms' test. Run it the same way (`new_film.mjs --3d`, copy `forms3d/.` over it, `clock`, `check`, `shots`), and run
it again after changing a form or `stage3d.js`.
