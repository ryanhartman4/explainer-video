---
name: explainer-video
description: Make a narrated, animated explainer video about a code repo, paper, system, algorithm, argument or idea, end to end - design the explanation, write and fact-check the script, animate it in sync with the spoken words, add voice, music and captions, and render the MP4. Use this whenever the user asks for an explainer video, a video walkthrough of a repo or README, "explain X in a short video", a narrated animation or animated diagram, a narrated chart or argument for a blog or X, a 3Blue1Brown-style video, a narrated 3D or particle film (a simulation, a showcase), or wants an existing explainer improved, even if they never say "explainer". Also use it to design or critique the storyboard, script or look of such a video. For a silent chart animation, a music video, or an HTML page that explains something, use other tools.
---

# Explainer video

This skill makes a finished explainer: a script, a voice, animation that lands on the spoken words, music, captions
and an MP4. It has two layers.

- **The method** (`references/method.md`): how to design the explanation. One picture that builds, the voice and the
  picture saying the same thing at the same moment, one change at a time, and looking at your own frames.
- **The engine** (`references/stage.md`): a small dependency-free film engine, `stage.js`, with tools that time the
  film from the narration, take contact sheets, check frames mechanically and render.
- **The 3D layer, when the subject calls for it** (`references/stage3d.md`): 30,000 points of light drawn under the
  stage with three.js, an orbit camera, and ready-made forms (an attractor, colliding galaxies, word clusters, a grid
  of tests, a flower, a waveform). The same points become each subject in turn.

Read the first two before the first film, and the third before a 3D one. A complete film made this way is in
`assets/demo/bloom/` (script, design, film): read its `SCRIPT.md` and `video/film.html` and work in the same shape.
Each example folder has `film.jpg`, the finished film's contact sheet: look at one before you design.
A film with a picture in perspective, a moving camera and a vertical cut is in `assets/demo/formations/`.
A complete 3D film, built by parallel scene builders, is in `assets/demo/one-sitting/`.

The two rules everything else follows:
1. **Design the picture before the words are final.** Find the one picture the whole film can be told on.
2. **Every change on screen is cued by a spoken phrase,** never by a clock time. `p.at("fault lines")` is when those
   words are said, so a re-recorded voice retimes the whole film by itself.

The paths below call this skill's folder `<skill>`.

## The process

Each step ends in a gate. Do not go on until the gate passes: later steps are built on earlier ones, and a wrong
script costs more to fix after it has been animated and recorded.

### 1. Ask once, then decide

Ask these together, each with its default, and proceed on the defaults for anything the user does not answer. If
the user said to just make it, do not ask: state your choices in one short list and go.

- **Who is it for, and what should they be able to explain afterwards?** This sets what to skip.
- **Length.** Default 90 seconds to 3 minutes. A finished film runs about 2.2 words a second once pauses are counted
  (90 seconds is about 200 words); `tools/script_check.mjs` gives the real figure.
- **Where will it be watched?** A blog or a shared screen: one cut. X or another feed: add a cut with captions
  burned in (feeds autoplay muted).
- **A vertical cut as well?** Default: no. Only on a yes is the film also made for the 1080 by 1920 frame of a
  phone feed. That cut is its own composition, built for the tall frame from the same script, voice and visual
  ideas; it is never the wide cut rearranged. It is roughly a second build of step 5, so settle it now.
- **Real clips?** Default: no. Only on a yes may a paragraph play a short recording of a real person (a talk, an
  interview) in place of the narrator. Without a yes the film uses no outside footage.
- **Voice.** Options are in step 6; default to the local voice on an Apple Silicon Mac, otherwise build on
  placeholder timing and ask when the picture is done.
- **Where the project lives.** Wherever the user says. Otherwise `~/Movies/<name>` on a Mac (off the iCloud
  Desktop) or, in a cloud session, a folder in the working directory. Do not pick the session scratchpad yourself:
  it gets cleared.

If the subject is someone's private repo and the film will be public, check the owner agrees.

### 2. Set up the project

```bash
node <skill>/scripts/new_film.mjs <project-folder>
```

```bash
cd <project-folder> && node tools/doctor.mjs
```

The first copies the engine, fonts, tools and narration scripts and downloads nothing. The doctor lists anything
missing. Add `--3d` to the first command when the film's picture is a shape, a space, a simulation or a crowd of
things, or when the user asks for 3D or a showcase (`references/stage3d.md`, "When to use it"): it adds the point
layer, three.js and the ready-made forms, and the film then starts from a 3D `film.html` in the `night` look. On a machine that has never made a film, run the `explainer-video-setup` skill. Ask the user before any
install or download, naming what it is, where it comes from and its size. Two downloads are easy to miss: a project
without Playwright needs `npm install --save-dev playwright-core` (8 MB), and the first `sh tools/audio.sh` fetches
numpy and scipy through uv (about 60 MB) unless the doctor says they are cached.

If the user said yes to a vertical cut, run `node <skill>/scripts/new_film.mjs <project-folder> --vertical` now. It
adds `video/film-9x16.html`, the second film file, and lists both cuts in `film.config.json`; every check, contact
sheet and render then covers both without being asked.

*Gate: the doctor prints `Ready.`*

### 3. Research, then write `SCRIPT.md`

Read the subject itself (the code, the paper, the data), not a summary of it. Collect every fact the film will
state, with where it comes from, in the `## Sources` section. A claim with no source line does not go in the film.

Then follow `references/method.md` sections 1 to 4: the takeaway sentence, the question ladder, the anchor picture,
the narration (one `## N. Title` paragraph per question, narration on `> ` lines exactly as spoken), and under each
paragraph its beat sheet.

If the user said yes to clips, follow `references/method.md` section 14: a clip is a paragraph with an `@clip`
line and the clip's own words typed from the recording, it is listed under `## Sources`, and any download is
asked for first. With no yes, there are none.

Write the narration in words the voice can read as they stand ("ten bits", "zero point one"). Where the written form
must differ from the spoken one (`FLT4` read as "F L T four"), add the pair to `SAY` at the top of
`narration/script.mjs` and its reverse to `WRITE` at the top of `tools/captions.mjs`. Cue phrases, in the beat sheet
and in the film, always match the text **as spoken**, after `SAY`.

```bash
node tools/script_check.mjs --target 90
```

Its length estimate is the clock the film will run on, silences included: cut or add words until it is within a
tenth of the length you promised.

*Gate: no ERROR; every WARN fixed or justified; the length is on target. Then show the user the takeaway, the anchor
picture and the script and wait for their answer, unless they told you to just make it.*

### 4. Fact-check, then lock the script

Before any animation or recording, check the script against the subject. With subagents available, start two fresh
ones at once: a **fact-checker** (every claim and every stated reason against the source, with file and line; flag
true-but-misleading claims, missing credit for borrowed ideas, and results presented as new that the subject's own
notes already have) and a **builder check** (what would someone animating this still have to guess?). Without
subagents, do both passes yourself with the script in one window and the source in the other. Fix what they find.

Whatever the subject, test each sentence against these: is it the worst case or the typical case, and does the
sentence say which ("at most four looks")? Is a number off by one at the boundary? Is "always", "never" or "must"
literally true? Does a stated reason actually produce the result? Is the claim wider than what the film shows? Is a
borrowed idea credited? The playbook's "Accuracy" section lists what five films' fact-checks caught in repos and papers.
For each clip: is the voice the person named, are the typed words what the recording says, and does the cut keep
the meaning the speaker gave it?

*Gate: every finding fixed or answered; `script_check` still clean. The script is now locked: later changes go
through this step again.*

### 5. Design and build

Fill in `DESIGN.md` (one page: the anchor picture's layout with coordinates, the look, what each colour means).
Choose the look by `references/method.md` section 11, and make the picture fill the frame: a correct diagram in a
panel with empty margin reads as boring. When the subject is a place and a camera should move over it, see
`references/stage.md`, "A picture with depth on one canvas". For a film with a vertical cut, sketch both frames there
first, each as its own composition (`references/method.md` section 13), then build `video/film.html` for the wide
frame and `video/film-9x16.html` for the tall one (`references/stage.md`, "A vertical cut"). Build each for its own
frame; never produce one by rearranging the other.

A film over about three minutes, or any film you will build with parallel subagents, puts each paragraph in its
own file under `video/scenes/` (`references/stage.md`, "Splitting a long film"; for a 3D film,
`references/stage3d.md`, "A long film, built in parallel"). Build and shoot the first scene yourself before anyone
else starts.

Then build `video/film.html` one paragraph at a time, each beat of the beat sheet becoming one block of code:

```bash
node tools/clock.mjs
```

```bash
node tools/shots.mjs 2
```

```bash
node tools/check.mjs
```

`clock` writes the word timings (placeholders until the voice exists). `shots.mjs 2` makes the contact sheet for
paragraph 2 (no number: every paragraph). After each paragraph, take its contact sheet, **open the image and look at
it**, and run the checker. Fix what you see before starting the next paragraph: a
layout mistake copied into five paragraphs is five times the work. Put real data on screen: compute it in the film
or in a script from the real source, and make the film call `film.problem(...)` if the data stops matching what the
narration says (the demo does this).

When all paragraphs are built, review the whole film with the five tests in `references/method.md` section 10,
starting with `node tools/shots.mjs --film` and with frame 0 (`node tools/shots.mjs --at 0`): it is the thumbnail,
so it should already show the question and the key picture. Review in rounds: name the two or three worst things as times and
numbers, fix those, re-shoot those moments.

*Gate: `node tools/check.mjs` reports 0 errors and no WARN you cannot justify (add `--captions` when a captioned cut
is planned), and the whole-film sheet tells the story without sound.*

### 6. Voice

- **Local, free (Apple Silicon Mac):** Breeze TTS 2, cloning the bundled narrator.
  `uv run --project ~/Developer/mlx-audio python narration/tts_local.py scenes --ref narration/voices/w_mid.wav all`
  Run it in the background: about 2.5 minutes of compute per minute of speech. Research and non-commercial licence:
  personal and unmonetized posts only. It re-takes any sentence that comes out over 176 words a minute and prints a
  `pace:` line for each: report those lines to the user with the loudness.
- **ElevenLabs** (any machine, exact word timestamps, costs credits): set-up and commands in the playbook, "Voice".
- **Monetized video, a new voice, pitch changes, alternate takes, a misread word:** the playbook, "Local voice".
- **A clip paragraph is never recorded.** `sh tools/audio.sh` cuts the clip and uses its own sound; the voice
  tools skip it. A real person's words are never spoken by the narrator's voice.
- **No voice available here:** render on placeholder timing with music only and say so plainly; the user can record
  on their machine and rerun steps 6 to 8 without touching the film. With no voice the mix holds the music up so the
  draft is audible, and its loudness reads lower than the target: that is expected, do not normalize it.

Then, after any take or any change to the narration:

```bash
sh tools/audio.sh
```

It post-processes the voice, rebuilds the clock on the real words, writes captions, synthesizes music and sound hits,
mixes them and prints the loudness (about -18 LUFS is right for a blog cut).

*Gate: re-run `node tools/check.mjs` and re-shoot the contact sheets on the real timing. Real speech is paced
differently from the placeholder, so look again for beats that now crowd or drag.*

### 7. Render and deliver

```bash
node tools/render.mjs
```

For a feed, also `node tools/render.mjs --captions --out out/<name>-x-raw.mp4`, then
`sh tools/master_x.sh out/<name>-x-raw.mp4 out/<name>-x.mp4` (loudness for feeds; playbook, "Last mile for X"). Pull two or three frames out of the MP4 and look at them. You cannot hear: report the measured
loudness, then ask the user to listen for misread words (a voice can read "lead" as the metal) and for the music
level. A misread word is respelled in `SAY` and that paragraph re-recorded.

A film with a vertical cut renders both at once: `out/<name>.mp4` and `out/<name>-9x16.mp4` (`--format 9x16` for
one). Pull frames from each. For a film with clips, list each clip and its source in what you tell the user: what
gets published is their call.

Tell the user plainly what was verified and what was not (for example: rendered on placeholder timing, voice not
yet recorded, nobody has listened).

*Gate: the MP4 plays, its frames match the contact sheets, and the user has what they need to judge the sound.*

### 8. Leave notes

Anything learned that the next film should know goes in the project's own `NOTES.md`; offer to fold durable lessons
back into this skill.

## When to use the back-up engine

Films 1 to 5 were made on HyperFrames (HTML and GSAP rendered by HeyGen's CLI). That pipeline is kept whole in
`assets/hyperframes/` with its record in `references/playbook.md`. Use it instead of `stage.js` when:

- the film needs a **3D character** (the Claw'd rig, `assets/hyperframes/lib/clawd.js`). Points, simulations and
  other three.js pictures run on `stage.js` through the 3D layer (`references/stage3d.md`);
- you are **revising a film that was made on it**;
- the user asks for HyperFrames, or needs its registry components.

The playbook's sections on voice, music, sound hits, accuracy, captions and the last mile for X apply to **both**
engines and are the reference for steps 4, 6 and 7. Its HyperFrames set-up and gotchas apply only to the back-up.

## Bundled files

- `references/method.md`: the design method. `references/stage.md`: the engine's API, tools and traps.
- `references/stage3d.md`: the 3D point layer: its API, writing a form, the ready-made forms, the handoff between
  scenes, building a long film in parallel, the captioned cut.
- `references/playbook.md`: the record of films 1 to 5, the Bloom demo and "One Sitting": every voice, music and
  loudness setting the author approved, what the fact-checks and reviews caught, and the HyperFrames pipeline.
- `scripts/new_film.mjs`: start a project (`--3d` adds the point layer), or refresh its engine with `--update`.
- `assets/template/`: what a new project is made of. `video/stage.js`, `stage.css` (four looks) and fonts; `tools/`
  (clock, shots, check, render, audio chain, captions, music, hits, mix, voice post, X master, clip cutter);
  `narration/` (script parser, ElevenLabs and local voice, word alignment); `SCRIPT.md` and `DESIGN.md` to fill in.
- `assets/demo/bloom/`: a finished 93-second film, "How a Bloom filter works", as the model for a script with beat
  sheets, a one-page design and a film file.
- `assets/demo/formations/`: a finished 2:21 film in a wide and a vertical cut, "How an NFL offense lines up": a
  field drawn in perspective on one canvas, a camera that swings between two seats, the film's own look, and one
  beat sheet in code that both cuts run.
- `assets/stage3d/`: what `--3d` adds to a project: `stage3d.js`, the forms in `forms3d/`, a 3D `film.html`, and
  the tall starter that `--3d --vertical` uses.
- `assets/demo/one-sitting/`: a finished 3:52 3D film in nine scene files, with the brief its eight parallel
  builders worked from, its own score script, and the notes of what the reviews caught.
- `assets/demo/forms3d/`: a gallery film that shows every ready-made form, one a paragraph. It is also their test.
- `assets/voices/`: the narrator of films 2 to 5 (synthetic, non-commercial). `assets/bakeoff/`: how to compare a new
  voice model by ear.
- `assets/hyperframes/`: the back-up engine's helpers, tools, examples and reference scenes.
