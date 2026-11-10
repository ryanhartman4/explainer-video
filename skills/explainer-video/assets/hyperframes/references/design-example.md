# Faultline explainer: design

## Intent
A private explainer for the author, under five minutes, on what Adam's `faultline` repo (private) does. The author has heard about it only from Adam and hasn't read the repo. The author knows ML well (parameter golf, nanochat, evals work at Meta) and speaks information theory, so the video skips primers and spends its time on Adam's ideas.

The one thought to leave behind: **Faultline spends cheap compute to save scarce bytes and time. A seed, a hash or a small model makes the guess, an exact check keeps it honest, and a map shows what has been tested.**

## Goals
- the author can explain FLT4 (rotate, then store each block as a trellis path through a hashed codebook) and say in one sentence each what drafting, Contour and the modalities lane do.
- Every number on screen matches the repo as of commit 5bcfde5. Sources are listed at the end of SCRIPT.md.
- It looks finished: 3Blue1Brown-style calm, every diagram drawn with care, smooth transitions, narration and visuals in sync to the word.

## Non-goals
- Teaching LLM basics, quantization basics or info theory.
- Covering every lane: the MLX engine, kernel maps, the `flt` factory CLI and the roadmap get a mention at most.
- Subtitles in this version. SCRIPT.md is the subtitle source, and the build also writes `captions.srt` from the TTS timestamps for later.

## Anti-goals (a failure even if it plays)
- Any wrong or inflated number, or a claim the repo does not support.
- Presenting borrowed ideas as Adam's: the trellis, the 3INST hash and the rotation come from QTIP (Tseng et al., 2024); the drafters come from LiquidAI (DSpark) and z-lab (DFlash). Adam's parts are the per-block seeds, the protect rule, the KLD-gated search, the Metal kernels, the `flt` factory, Contour and the modalities codecs.
- A wall of text on screen. Narration carries the words; the screen shows terms, numbers and diagrams.
- Running over 5:00.
- Generic "AI video" look: gradient blobs, stock icons, default fonts, bouncy easing.

## Production (decided)
- **Engine:** HyperFrames (HTML + GSAP + SVG/Canvas, rendered by headless Chrome). One sub-composition per scene. ManimGX is the fallback for any single shot that SVG handles badly, dropped in as a clip.
- **Narration:** ElevenLabs `eleven_v4`, generated one scene at a time with the `with-timestamps` endpoint (`narration/tts.mjs`), so each animation cue lands on its word and a single scene can be redone alone. the author picks the voice from three short samples before any animation, so scenes are timed once. Budget: the account is on the free plan (10,000 credits a month, resets 2026-11-11). Samples cost about 600, one full take about 3,900, which leaves room for one more full take or several scene redos. The text is locked before the full take.
- **Music:** an original ambient piano-and-pad track synthesized in Python (numpy), with no downloads and no license. Slow, warm, curious, in the spirit of 3Blue1Brown's scores. Ducked about 12 dB under the voice; it swells a little at scene changes and at the end.
- **Data:** where the repo's own code can produce what is on screen, use it: the 3INST hash values for the bell curve, a real Viterbi path on a sample block, a real `contour_search.py` run for the Contour scene. Any Adam code runs from a copy outside the repo with `python -I`. Scene 4's before/after histogram uses one real weight matrix if the author approves a small download (one tensor, fetched by HTTP range request from the model's safetensors file on Hugging Face); otherwise it uses a synthetic block with planted outliers, labeled "illustration".
- **Output:** 1920×1080, 30 fps, H.264 MP4 at `out/faultline-explainer.mp4`, plus `captions.srt`.

## Style Prompt
Dark, quiet and precise, like a 3Blue1Brown lesson. Near-black canvas. Thin strokes that draw themselves on, dots that glide into place, shapes that morph into the next idea. One idea on screen at a time, framed with plenty of empty space. Color carries meaning: blue is the true data, yellow is the guess or the chosen path, green passes, red fails. Motion is slow and eased, never bouncy; nothing pops in without a reason.

## Colors
| role | hex |
|---|---|
| canvas | `#0b0c10` |
| ink (text, axes) | `#ece6d8` |
| muted (grid, faint edges, footnotes) | `#5d6470` |
| true data, proposer | `#58c4dd` (Manim blue) |
| guess, chosen path, highlights | `#f7d96f` (soft yellow) |
| pass, verifier | `#83c167` (Manim green) |
| fail | `#fc6255` (Manim red) |
| map, coverage | `#9a72ac` (Manim purple) |

## Typography
- **Statements and labels:** a Computer Modern serif (KaTeX's `KaTeX_Main`, from the katex npm package's fonts), the 3Blue1Brown voice. Fallback: Newsreader.
- **Bits, bytes, numbers and code:** IBM Plex Mono, light 300 for labels and 600 for key numbers, with tabular figures.
- Why two voices: the serif speaks for the ideas, the mono for the machine. Bit windows, byte bars and results tables are always mono.
- Sizes: titles 72–96 px, labels 32–40 px, data labels 24 px minimum.

## What NOT to Do
- No full-screen linear gradients (they band in H.264); use flat black with a soft local glow.
- No bounce, elastic or spin eases; use `power2`/`power3`/`expo` in and out, and `sine` for ambient drift.
- No emojis, stock icons or clip art. Every glyph (die, check, grid) is a simple drawn SVG in the palette.
- No more than about eight words of prose on screen at once. Numbers, labels and equations are fine.
- No red or green without meaning; they mean fail and pass, nothing else.

## Left to the builder
Exact scene timings (set by the narration lengths), the transition used at each scene change, the specific easing per shot, how many trellis states to draw, the music's key and chord progression, and the pixel shape in scene 1.
