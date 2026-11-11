# How an NFL offense lines up: notes

Made on 2026-11-10 and rebuilt on 2026-11-11 with the explainer-video plugin at commit `d39f0b3`. A serious-fan
explainer, 2:20.8, in three cuts. The first version (a flat diagram in the `paper` look, 2:12.5) is kept in
`out/v1/`; its voice take is in `narration/audio/take1/`.

## What is in `out/`

| File | What it is | Measured |
|---|---|---|
| `nfl-formations.mp4` | wide cut, 1920 x 1080 | -17.6 LUFS, peak -2.4 dBFS |
| `nfl-formations-x.mp4` | wide cut, captions burned in, mastered for feeds | -16.0 LUFS, peak -1.1 dBFS |
| `nfl-formations-9x16.mp4` | vertical cut, 1080 x 1920, captions burned in, mastered for feeds | -16.0 LUFS, peak -1.1 dBFS |
| `*-raw.mp4` | the two captioned cuts before `master_x.sh` | |
| `captions.srt` | 52 captions, from the real word times | |
| `v1/` | the first version's three cuts | |

`check.mjs --captions` reports 0 errors and 0 warnings for both film files on the real timing. All three run 140.8 s at 30 fps. The
thock hits at 19.928, 66.597 and 83.467 s land at 0.0 ms lag after AAC in all three. Frames pulled from the MP4s
match the contact sheets. Each file is 65 to 70 MB: the grain on the turf costs bitrate.

## Version 3: the narration as talk (2026-11-11)

The author said the scripts sounded "meant to be written and read instead of spoken and heard". Version 3 keeps the
picture and rewrites the narration as talk: 525 words against 300, 30 contractions against none, no colons against
eight. It runs 3:23.3 against 2:20.8. Version 2's cuts are in `out/v2/`, its script in
`review/SCRIPT-v2-as-written.md`, its take in `narration/audio/take2/`.

- Measured: wide cut -17.4 LUFS, peak -2.4 dBFS; thock hits at 0.0 ms lag; `check.mjs --captions` clean for both
  cuts; no pause inside a paragraph longer than 0.71 s.
- The voice is at its natural pace (the pace limit is off). The trim now cuts hiss a take runs on into.
- A fact-checker and a listener (two fresh agents) reviewed the rewrite before recording; their findings are folded in.
- Only `video/play.js` changed in the picture: every cue phrase, three added beats, and the formation name now leaves
  when the quarterback moves and returns when it is spoken.
- Not settled: the length. The brief was about two minutes.

## Why it was rebuilt

The author's review of the first version: it lacked the look of the One Sitting demo, had "a lot of white space",
was "very boring", and the narrator rushed some sentences. The author proposed a 2.5D field with a camera that
swings to the broadcast angle. Version 2 keeps the script, the data and every cue phrase, and replaces the picture and the voice
take.

## How it is built

- `video/shared.js` holds the facts: the spots a man can stand on, which are on the line, every formation as "who
  stands where and what job he has", and the usage numbers. Its `problems()` checks every formation (eleven men,
  the same seven on the line, the personnel number and side counts match). Both films refuse to render if it
  reports anything.
- `video/field.js` draws the field, the men and the telestrator marks on one canvas, in perspective, from the time
  alone. The camera is eight `film.value()` tracks (angle around, angle up, distance, focal length, target, where
  the target sits on screen), so a swing is eight tweens. A chip keeps its size on screen and stands a yard off the
  turf; men are drawn far to near.
- `video/play.js` is the beat sheet as code: what happens on the field at each phrase, in yards. Both cuts run it.
  It asks each film for its type through a small `hud` object (heading, name, digits, bars, note).
- `video/film.html` and `video/film-9x16.html` each bring a spot table, four camera seats (`top`, `rule`, `tv`,
  `tvBox`) and their own type. The vertical film has closer splits, a higher broadcast seat and one large piece of
  type under the field per beat.
- `video/look.css` is the `turf` look. `new_film.mjs --update` does not touch it, `field.js` or `play.js`.

## Voice

Local Breeze TTS 2, cloning `narration/voices/w_mid.wav`, seed 0. Non-commercial licence. The first take averaged
148 words a minute but ran five sentences at 185 to 218. `glitch.py` did not flag them: it looks for sentences that
differ from the take's own average, and several rushed ones raise the average. The project's
`narration/tts_local.py` now measures each sentence, and any over 176 words a minute is recorded twice more with an
unhurried direction; the take nearest 158 wins. Eight sentences were re-taken this way (198 to 168, 201 to 166,
183 to 147, 201 to 165, 194 to 131, 212 to 165, 214 to 154; "Then watch where they line up." stayed at 198 words a
minute, which is 3.9 syllables a second, an ordinary pace for six short words). New seeds alone did not help: a test
gave 159 to 214 words a minute on new seeds and 106 to 162 with the unhurried direction.

The slower take is 8 seconds longer. The film now runs 2:20.8 against the two-minute brief.

Nobody has listened to this take yet.

## Lessons for the next film

- **Decide the look against the best film so far, and show a frame early.** A light diagram in a panel passed every
  check and still read as boring. The picture should fill the frame.
- **A canvas renderer with a camera made of value tracks gives 2.5D inside `stage.js`** without the 3D layer:
  project yards to pixels with a pinhole camera, draw far to near, keep type in the DOM on top.
- **Things that stand up hide the ground behind them.** In the broadcast view a mark on the far side of a chip is
  covered by it; put marks on the near side, or downfield.
- **Put one shared choreography in yards, and give each cut its own spots, seats and type.** Both cuts then make
  every change on the same word, and neither is the other rearranged.
- **Type on a full-bleed picture needs a calm place:** a soft shade at the top and bottom, drawn after the ground
  marks and before the men.
- **A square-on sideline view stacks the line into one column.** A seat 18 degrees behind square separates the men
  and uses the frame's width.
- **Words a minute overstates the pace of short-word sentences.** A syllable rate would be a better limit.
- **A caption that sits above a value which pulses needs 16 px more room** than one above a still value.
- From version 1, still true: a thing that should start hidden gets `show()` as its first call; change a colour
  and its letter in one instant; do not count a number between two true values; a sound hit on a stressed word can
  clip the mix; `rise` entrances sit up to 26 px low while they arrive.

## To change something

- A line's delivery: record the paragraph on another seed into `narration/audio/altN_K`, compare, copy the chosen
  take over, then `sh tools/audio.sh`, `node tools/check.mjs --captions`, and the three renders.
- A camera seat: the `cam` table at the top of each film file. Shoot it with `node tools/shots.mjs --at 62`.
- The three renders: `node tools/render.mjs --format 16x9`; `node tools/render.mjs --format 16x9 --captions --out
  out/nfl-formations-x-raw.mp4` then `sh tools/master_x.sh out/nfl-formations-x-raw.mp4 out/nfl-formations-x.mp4`;
  the same pair with `--format 9x16` and the `-9x16` names.
