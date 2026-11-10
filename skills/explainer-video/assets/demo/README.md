# The worked example

`bloom/` is a finished film made with this skill's method and engine: "How a Bloom filter works", 99 seconds,
6 paragraphs, 34 beats, the `paper` look. Read it in this order:

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
cd /path/to/bloom-demo && node tools/clock.mjs && node tools/check.mjs --captions && node tools/shots.mjs --film
```

Then open `video/film.html` in a browser, or `sh tools/audio.sh && node tools/render.mjs` for an MP4 (music and
sound hits only until a voice is recorded: step 6 of the skill).
