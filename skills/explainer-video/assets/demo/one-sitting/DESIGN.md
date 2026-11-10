# One Sitting: design

## Who and where
Anyone curious about what an AI model can make. Watched on a laptop or a shared screen, with sound. About four
minutes, one 1080p30 cut, no burned-in captions (`out/captions.srt` is written beside the film).

## The anchor picture
30,000 points of light, one WebGL particle system (`G3` in `video/stage3d.js`) drawn under every scene. The same points
become each paragraph's subject. Nothing is cut to: every change of subject is a flight of the same points.

```
heading (120, 96)                                        running head "one sitting" (1800, 56)

            the points: a form about 30 x 16 world units around the origin
            (43.6 px a unit at the rest camera: az 0, el 0, dist 34, fov 40)
            pushed to one side with `at: [x, y, z]` when a panel shares the frame

result, verdict, poem, stats                             y 780 to 984
```

| paragraph | the points become | real data |
|---|---|---|
| 1 Nobody filmed this | the title, a ringed globe, the word "Claude" | the point count |
| 2 Words become geometry | the word "king", then labelled word clusters | layout is an illustration, marked so |
| 3 One word at a time | the stacked sheets of a network | scores are an illustration, marked so |
| 4 Three equations | the Lorenz attractor | RK4 integration; the two markers' gap |
| 5 Find the bug | a grid of 10,000 tests | both versions of the function, run at load |
| 6 One law | two colliding galaxies | a restricted N-body run |
| 7 Only because it is beautiful | a sunflower head, then a flower | Vogel's rule, n x 137.508 degrees |
| 8 How this film was made | one cluster per scene, then the soundtrack's waveform | agent counts; the mix's envelope |
| 9 What next | each earlier form in turn, then the closing question | lines written, frames |

## Look
`night` (the `night` look in `video/stage.css`): a near-black blue ground so additive points read as light, warm white ink, Newsreader for
headings and the poem, Instrument Sans for labels, JetBrains Mono for code and numbers. One accent, Claude's coral.

## What each colour means
| colour | means |
|---|---|
| cool white to blue points | the points at rest: no meaning yet |
| accent (coral) | the one thing the frame is about: Claude's name, the arrow, the failing test fixed, the voice |
| blue | the second of a pair (the other marker, the other galaxy, the music) |
| green / red | a test that passes / fails (always with a count beside it) |
| ink, muted | structure and labels |

## Motifs
- A change of subject is always a flight of the points (`G3.morph`), 1.2 to 2.2 seconds, in the gap between paragraphs.
- Credits for borrowed ideas appear as a small muted note the moment the idea is shown.
- Illustrations are marked "illustration" on screen; everything else is computed.
- One hero camera move per scene.

## Not in this film
Stock footage, images, logos, a character. A claim about Claude's internals that cannot be sourced. Any number that
was typed in instead of computed. Code this session did not write presented as its own: the stage engine, three.js,
the speech model and the score script are credited on screen in scene 8 and on the end card.
