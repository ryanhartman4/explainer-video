# Permanent underclass explainer (film 5): design, as a model for the directed prompt

Paths in this file are relative to that film's project folder; its composition is `example-film5-continuous.html`, beside this file.

## Intent
A narrated short, about 80 seconds, for the author's blog and X. It redoes the silent 25-second ManimGX chart from 2026-10-19 (the author's Excalidraw sketch, "economically useful AI capabilities vs time", with a pink band of "conditions sufficient for permanent underclass").

The one thought to leave behind: **the band where capital could harden into class is real, but a fast takeoff crosses it too quickly for anyone to dig in.** Past it, owning a model stops meaning control, so the would-be overclass loses its grip too, and everyone ends up on one line.

It is also film 5 of the explainer-video skill and the test bed for the meta-prompt's ideas (directed prompt anatomy, motion numbers, beat grid, sound hits, first-frame poster, frame-pointed review) and for a 3D character, Claw'd, rendered with Three.js inside HyperFrames.

## Goals
- A viewer can retell the argument in three steps: the band (labor stops mattering, capital still buys control), the head start (capital holders reach each rung first, widest inside the band), the crossing (too short to set; past it the lines merge).
- The picture works muted: every step reads from the chart and Claw'd alone, and the X cut has burned-in captions.
- Frame 0 is a poster: the question, the band and Claw'd, fully composed.
- Claw'd's feelings track the argument: curious, uneasy, tense, alarmed, relieved, glad.

## Non-goals
- Proving fast takeoff, or dating any rung. Time has no units; the curve's shape is the author's claim, drawn as illustrative.
- The economics of the second stretch (superintelligence to blue-collar automation). One sentence names it as the hard test; the blog post carries the argument.
- A survey of the literature. One credit on screen for the worry's formal version.

## Anti-goals (a failure even if it plays)
- **Claw'd pleased about losing control.** Claw'd is the AI on the chart. At "owning a model may stop meaning you control it" Claw'd is uneasy, eyes on the blue line. Its relief lands on the merge, after "the head start stops buying anything": the AI glad to be nobody's moat, never glad to escape its owners. Relief settles (an exhale), with no glad hop. At the end Claw'd turns to the viewer, attentive, on "an AI that no one controls still has to be good for us": it is the one being asked.
- **The relief's hidden premise.** It assumes an AI nobody owns is good for people; published work on owners losing control (Kulveit et al. 2025, Borretti 2026) reads that as bad news for everyone. the author chose (2026-11-04) to name it as the second of two open tests in paragraph 7.
- **Unmarked fan art.** The end card says Claw'd is fan art of Claude Code's mascot, not made or endorsed by Anthropic.
- Stating the thesis as settled fact where it is the author's argument. The chart is labelled illustrative; the narration's claims are the model's claims.
- Capital holders shown stalling or plateauing. They lead in time and everyone else catches up (the author, 2026-10-19).
- Chart elements that bounce. Only Claw'd's posture may spring (position and size may overshoot; opacity and colour never).

## Directed prompt (meta-prompt anatomy)

**GOAL.** The viewer feels the dread of the band, the jolt of the crossing, then relief.

**FORMAT.** About 80 s. 1920×1080, 60 fps, H.264 yuv420p with faststart. HyperFrames + GSAP for the chart (SVG), Three.js r160 for Claw'd (WebGL canvas, `lib/clawd.js`). Linear, not a loop. One continuous composition (`compositions/film.html`): the chart never cuts, so there are no crossfades; narration is recorded in seven paragraphs that only set the clock.

**SHOTS.** One hero move per shot. Secondary moves travel 50–70% as far and start 6–12 frames later. Ambient motion stays under 5% of the hero's and never stops (Claw'd breathes at 1.2%, sways its arms at 3%).

| # | Narration | Hero move | Secondary | Claw'd |
|---|---|---|---|---|
| 1 | the question | (frame 0 is the poster) the title holds, then exits up | the band's label fades to its chart size | curious; a hello hop on "Claw'd" |
| 2 | the ladder | the capability axis, lying flat, turns upright on a bar line | rung ticks write on one per eighth note beforehand; the time axis grows out after | watches the rung being written |
| 3 | the band | the band trims from full width to the chart and deepens | its edge labels light | uneasy on "underclass" |
| 4 | the split | the white line climbs; at the split, yellow peels off above blue | rungs light as each line reaches them; the gap brace widens | curious, then tense on "widest" |
| 5 | the crossing | the line whips through the band; blue meets yellow and they join as green | the legend merges to "everyone" | alarmed hop on "blink"; serious on "control"; relieved on "one" |
| 6 | relief | the band drains and "permanent underclass" is struck through | the time-in-band bracket (yellow's entry to blue's exit) drops to the time axis | relieved; settles with an exhale |
| 7 | the next tests | a dotted amber fork bends right from the band's top to the blue-collar rung: a slower climb, ending in *?* | the end card and fan-art notice write on | curious at the fork; turns to the viewer, attentive, on "good for us" |

**TECHNICAL.** Every frame is a pure function of time: GSAP timelines seeked by HyperFrames, `K.driver` state, no timers, no `Math.random` (seeded `K.rng` for blinks). Narration words set the tween times through `K.at` (root time; `K.cue` gives paragraph time); layout cues snap to the nearest eighth note through `K.snap`, and `tools/build.mjs` starts each paragraph's voice on a beat (or a bar). A spike rendered the same 540 frames twice with identical MD5s (`spike/clawd/`).

**BAN LIST.** Grows after each render round.
- purple-to-blue gradients, glow, lens flares, bloom
- decorative particles or floating dust
- everything fading in at once; a fade-and-slide-up on every element
- centred-everything layouts (the title and the chart sit left)
- text that moves while it is being read (text holds still at least 8 frames before it moves)
- bounce on chart elements; emoji; stock icons
- more than 3 flashes a second anywhere; rung labels change colour at most once per 20 frames
- Claw'd's eyes leaving the flat of its face (gaze reach is capped at 0.7 glyph units)

**MATERIALS, LIGHT, NUMBERS.** See "Claw'd" below and "Motion numbers".

**SOUND.** Picture first: it must work muted. A synthesized bed (D major, 72 BPM, films 2–4's `tools/make_music.py`), ducked under the voice. Hits are synthesized in code and land on the frame of their visual event or one frame after: a soft pluck on a chord tone when a line reaches a rung, a felt-mallet low thump when the line enters the band, a rising two-note figure at the split, a resolving chord at the merge, a dry pencil scratch for the strike-through. The composition records each hit's time (`K.hit`) and the mixer reads them, so sound and picture share one clock. Voice normalized to −20 LUFS per paragraph (`tools/voice_post.sh`); the blog cut's mix lands about −18 LUFS and the X cut is mastered to −16, true peak −1.5 (`tools/master_x.sh`). Check the band below 120 Hz, and the sync after AAC encoding (`tools/sync_check.py`).

## Production (decided)
- **Engine:** HyperFrames 0.8.209 (re-tested on 0.9.13 on 2026-11-04: same frames, SSIM 0.997) + GSAP 3.14.2; Three.js 0.160.1 (`assets/vendor/three.min.js`, MIT, from `npm pack three@0.160.1` (`build/three.min.js`) with its first-line `console.warn(...)` call replaced by `0`) with RoundedBoxGeometry and RoomEnvironment ported to `lib/three-extras.js`.
- **Narration:** Breeze TTS 2 (8-bit MLX, through mlx-audio), cloned from films 2–4's voice `assets/voices/w_mid.wav` (bundled with this skill) (with its transcript `w_mid.txt` beside it; the unshifted 177 Hz woman's voice), copied into `narration/voices/`, every sentence with the spoken direction in `narration/tts_local.py`. Switched from OmniVoice-MLX on 2026-11-04: the author judged a bake-off by ear (`review/tts-bakeoff/`; the OmniVoice cut is kept in `review/omnivoice-film-2026-11-04/`). Breeze's license is research and non-commercial, like OmniVoice's CC-BY-NC: fine for this unmonetized post. Word times estimated by `narration/align.py` (about 0.2 s); Whisper alignment is the upgrade if a hit must land on a word.
- **Data:** the curve and rungs are the author's (from the 2026-10-19 draft `full.py`, recovered from the session transcript into `video/data/chart.js`): `capability(t) = 1.7 tanh(t/3.5) + 7.3 e^{1.33(t−10)}`, band edges at 4.0 and 5.4, capital holders' lead `0.35 sin(π u)` in time between the split (t = 8.3) and the merge (0.15 after the band's upper edge). All illustrative; the chart says so.
- **Output:** `out/underclass-explainer.mp4` (blog), `out/underclass-explainer-x.mp4` (burned captions), `out/captions.srt`.

## Claw'd
- **Who:** the AI on the chart, reacting to what its growth means for people. Claude Code's terminal mascot (`▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝`) built in 3D; fan art, unaffiliated.
- **Geometry (glyph units, 1 = a quadrant's width = 0.1 world units):** body 12×8×5, eye slits 1×2 set 2 below the top and 2.5 in from each side, arm stubs 2×2, four legs 1×2. Rounded boxes (radius 0.9 on the body).
- **Material:** non-metal, IOR 1.5 (4% reflectance). Body `#d97757`, roughness 0.5, clearcoat 0.25 (satin vinyl). Eyes `#17110f`, roughness 0.18, clearcoat 1 (they catch the key light). Room environment at 0.45.
- **Light:** key 2.2 from upper left front, fill 1.1 from right (2:1, soft), rim 2.2 from behind so the coral separates from the canvas. Linear tone mapping at 0.9 (ACES and AgX wash the coral toward peach). FOV 35°, camera 12° above.
- **Expression:** eyes carry it (height, width, tilt, gaze); posture backs it at smaller size (squash, lean, pitch, arms). Gaze follows the pen tip; the body turns a quarter radian behind the eyes. Blinks on a seeded schedule, 4 frames shut and 6 opening, suppressed on key beats (`blink` 0).
- **Place:** standing on the time axis's baseline to the right of the chart, facing it.

## Motion numbers
In frames at 60 fps (one frame 16.7 ms); constants in `K.M` (`lib/fl.js`).
- Enter with ease-out (`power3.out`), 24 frames. Exit with ease-in (`power2.in`), 16 frames: exits are shorter. Moves across the screen use ease-in-out, 45 frames. Linear only for progress (the pen), rotation and loop phase.
- Stagger grouped elements 2–4 frames. Text holds still at least 8 frames before it moves.
- Claw'd springs (`back.out(1.4)`) on posture only.

## Beat grid
72 BPM at 60 fps is exactly 50 frames a beat and 200 a bar, so every beat lands on a frame. Each beat is computed from absolute time (`K.beat(i) = 60 i / 72`), never accumulated. Each narration paragraph starts on a beat, or a bar where its first word fires a layout change (`tools/build.mjs`: `ON_BAR`, `PAD`); layout cues snap to the nearest eighth note (`K.snap`, at most 0.21 s); the flat axis's ticks write on one per eighth note.

## Accessibility
- Text contrast at least 4.5:1 on every frame (`hyperframes check`, its contrast audit), including text over the band.
- At most 3 flashes a second; nothing large flashes at all.

## Style
Dark, quiet and precise, like a 3Blue1Brown lesson and films 1–4. Near-black canvas with a soft radial lift. Computer Modern serif for ideas and labels, IBM Plex Mono for the footnotes. Thin strokes draw on, dots glide.

## Colors
| role | hex |
|---|---|
| canvas | `#0b0c10` |
| ink, the "everyone" line before the split | `#ece6d8` |
| muted text (passes 4.5:1) | `#8a909b` |
| grids, axes | `#3a3f48` / `#8a909b` |
| capital holders | `#f7d96f` (yellow) |
| everyone else | `#58c4dd` (blue) |
| everyone, after the merge | `#83c167` (green) |
| the band | `#fc6255` (red) at 15–35% fill |
| Claw'd | `#d97757` (Claude coral, only Claw'd uses it) |
| the next test (wash, fork, ?) | `#f2b33d` (amber, 10% fill for the wash) |

## What not to do
See the BAN LIST. Also: no Excalidraw hand-drawn look (the author chose the 3Blue1Brown palette on 2026-10-19), no dates on the time axis, no logos.
