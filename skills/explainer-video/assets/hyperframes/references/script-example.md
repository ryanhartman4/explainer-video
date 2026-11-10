# Faultline explainer: script and storyboard

Narration for ElevenLabs, scene by scene, with what is on screen. About 670 words, which should run 4:20 to 4:45 with the gaps between scenes; the voice samples give the real pace before the full take. Hard limit: 5:00.

The **Narration** blocks are the exact text sent to text-to-speech (`narration/tts.mjs` reads them from this file). **Cue** words mark where an animation fires; the build reads their times from ElevenLabs' character timestamps. Each part scene keeps a small "proposer / verifier" strip in a top corner naming the two roles for that part, so the pattern repeats without the voice saying it.

Spoken spellings, applied only to the TTS text: `FLT4` → "F L T four", `9B` → "nine B", `xz` → "X Z", `KL` → "K L", `QTIP` → "Q-tip".

---

## 1. Fault lines (cold open, ~26 s)

**Narration**
> Take a black and white picture. To send it, you could pay one bit for every pixel. Or you could guess each pixel from neighbors you've already sent. Inside the shape, the guess is almost always right, so those pixels cost almost nothing. You pay only where black meets white: along the fault lines. One of Adam's early experiments did exactly this, and it shares the project's name.

**Screen**
- A 64×64 pixel grid with a soft blob shape. A bit counter in the corner.
- "one bit for every pixel": every cell flashes once; the counter runs to 4,096.
- "guess each pixel": reset. Pixels fill coarse to fine (corners, then centers, then edges, as in `research/early/faultline.py`). Interior pixels fill dim and fast at ~0 bits each; boundary pixels flash yellow and add to the counter, which stops far below 4,096.
- "fault lines": the interior fades and only the glowing boundary stays.
- "shares the project's name": the boundary line draws into the word **Faultline**.

## 2. The pattern (~20 s)

**Narration**
> Faultline's motto is to spend cheap compute to save scarce bytes, bandwidth and time. It does that in four places: model weights, text generation, testing, and plain files. Each pairs a cheap proposer with an exact verifier. And a coverage map, called Contour, tracks what's been tested. Let's start with the weights.

**Screen**
- The motto, set in the serif: *spend cheap compute to save scarce bytes, bandwidth and time*.
- Four small cards rise: **weights · generation · testing · files**.
- On the cue words, three glyphs: **proposer** (blue, a die), **verifier** (green, a check), **map** (purple, a grid with shaded regions). Arrows join them into a loop.
- "start with the weights": the loop shrinks into the top-corner strip; the weights card grows to fill the frame.

## 3. Four bits per weight (~24 s)

**Narration**
> On a laptop, each of a model's billions of weights gets about four bits. The standard format rounds each weight to one of sixteen levels, with a scale for every 32 weights. That has two weak spots. One large weight stretches the levels for its whole group. And rounding numbers one at a time wastes bits; coding them together gets closer to the rate-distortion limit.

**Screen**
- A weight matrix as a dim heatmap; zoom into one group of 32 weights plotted as dots on a line.
- Sixteen evenly spaced levels drawn as ticks, labeled `Q4_K: 16 levels, scale + min per 32 weights`.
- "one large weight": one dot slides far out; the ticks stretch to reach it, and the other 31 dots now share only a few ticks.
- "rate-distortion limit": a small plot of error against bits per weight for a bell-curve source. The limit curve `D(R) = 2^(−2R)` in grey; at 4 bits, a point for the best possible one-at-a-time quantizer (Lloyd-Max, error 0.0095) sits well above the limit (0.0039). The gap is shaded.

## 4. Rotate (~24 s)

**Narration**
> Faultline's answer builds on a 2024 paper called QTIP. Step one: rotate. Each block of 256 inputs is multiplied by random signs and a Hadamard matrix, a grid of plus and minus ones. The engine applies the same rotation to the activations, so the model computes the same function. But each outlier is now spread across 256 weights, and the block looks like a clean bell curve.

**Screen**
- Citation, small and muted: `QTIP: Tseng, Sun, Hou, De Sa (2024)`.
- A 16×16 picture of the Hadamard pattern (the real one is 256×256), squares in blue (+1) and dark (−1), with a row of random sign flips beside it.
- Equation, drawn on: `W x = (W D H)(H D x)`, note `H·H = I, D·D = I`.
- "spread across": a block's histogram with heavy tails morphs into a smooth bell curve with a Gaussian outline drawn over it. A log-scale y axis keeps the tails visible.

## 5. The trellis (~32 s)

**Narration**
> Step two: store each block as a path. Picture a window of fourteen bits. Each weight shifts four new bits into the window, and a cheap integer hash turns the window into a number. Across all sixteen thousand windows, those numbers form the same bell curve, so nobody ships a codebook. The encoder runs Viterbi over every state to find the path whose numbers best match the real weights. The decoder just shifts and hashes.

**Screen**
- A 14-cell bit window. Four new bits slide in from the right, four drop off the left. The window feeds a box labeled `3INST hash`: multiply-add, mask, xor, then split into two half-floats and add. A number pops out and lands on an axis.
- "sixteen thousand windows": the real 16,384 hash values (computed with the repo's formula) rain onto the axis and pile into the bell curve. Label: `2¹⁴ = 16,384 values, computed on both sides, never stored`.
- "Viterbi": a trellis, weights left to right and a column of states per step (draw ~12 states; the real one has 16,384). Faint edges everywhere; the best path lights up yellow.
- Under it, the real weights (blue dots) and the decoded values along the path (yellow dots) line up.
- "shifts and hashes": a tiny loop, `s = (s << 4 | n) & 0x3FFF;  w = d · hash(s)`.

## 6. 132 bytes (~26 s)

**Narration**
> Each block of 256 weights becomes 132 bytes: a scale, a start state, and the path. That's about four point one bits per weight. Adam's version tries four hash seeds per block, keeping the best, and leaves the most sensitive layers at six bits. Against the full model, KL divergence drops by a third to a half compared with the standard format, in a slightly smaller file.

**Screen**
- A byte bar: `[scale 2 B][start state + seed 2 B][path: 128 B of 4-bit codes]` → `132 B / 256 weights = 4.125 bits`.
- Four dice for the seeds; the best one per block lights up.
- The error plot from scene 3 returns: FLT4's measured point (0.0046 with four seeds, ROADMAP A2) lands close to the limit, far below the one-at-a-time quantizer.
- Footnote: `kept at Q6_K: first 2 blocks, attention in the first 70% of layers, token embeddings (28 tensors on the 1.2B)`. Second footnote: `Metal kernels for llama.cpp and MLX`.
- Bar chart, KL divergence vs full precision (lower is better), FLT4 vs `Q4_K_M`, with top-1 agreement and file size beside each:
  - LFM2.5 1.2B: 0.052 vs 0.103 · top-1 89.5% vs 83.2% · 0.70 vs 0.73 GB
  - LFM2.5 2.6B: 0.115 vs 0.175 · top-1 84.7% vs 80.9% · 1.55 vs 1.67 GB
  - Ornith 9B: 0.127 vs 0.216 · top-1 88.2% vs 84.8% · 5.49 vs 5.63 GB

## 7. Drafting (~27 s)

**Narration**
> Faultline can also add a drafter, itself compressed to FLT4. The drafter guesses a block of tokens. The big model checks the whole block in one pass and keeps every guess up to the first miss. Adam's rule is that greedy output must match the plain model byte for byte. On the 9B model, FLT4 with a drafter ran 1.4 to 1.6 times faster than the standard format without one.

**Screen**
- A sentence building token by token. The drafter (small, grey) shoots out seven chips at once.
- The big model (large, blue) sweeps across all seven in one pass: the first three turn green, the fourth red; the rest fall away; the big model's own token replaces the red one. Repeat twice, faster.
- Tag: `drafters: DSpark (LiquidAI) or DFlash (z-lab), rotated and coded to FLT4`.
- Speed bars: `Q4_K_M, no drafter: 16.7 / 13.1 tok/s` vs `FLT4 + drafter: 26.5 / 18.0 tok/s` (two warm passes), `1.4–1.6×`. Footnote: `codec and drafter gains not yet measured apart`.

## 8. Contour (~33 s)

**Narration**
> Contour decides which test to run next: where it's least sure, and where pass flips to fail. It groups failures by type and estimates the odds that the next one is new. When those odds are low and little space is left untested, it says stop. Contour once found a cheaper hash with one to two percent less error on real weight blocks. But the model's outputs got worse, so Adam rejected it. Now real-model KL divergence decides.

**Screen**
- A 2D knob space. Test points appear: green for pass, red for fail, a different shape per failure type.
- A soft boundary forms between pass and fail. New picks pulse as rings, most on the boundary, every third one out in the open.
- A small panel: the Good-Turing "chance next failure is new" and the untested share, counting down until `STOP` (rule: Good-Turing < 0.10 and untested < 2%). The points, picks and panel numbers come from a real `contour_search.py` run on a toy pass/fail problem, so every pick on screen is one Contour made.
- The rejected hash as a card: `3.5-op codebook · block error −1.5% · model KL +9% · speed: same · rejected`.

## 9. Files (~30 s)

**Narration**
> Last, the same trick on plain files. A small language model predicts each next token, and an arithmetic coder pays only for surprise: minus log two of the probability the model gave the real token. It's the bits-per-byte score you know from parameter golf, as a zip tool. On 687 kilobytes of text, the file came out under half the size xz makes. The catch: decoding needs the same model, and runs at about eight kilobytes a second.

**Screen**
- A sentence streams in. Under each token, a bar whose height is `−log₂ p`: short for predictable tokens, tall for surprising ones. The bars stack into a file-size meter.
- Tag: `exact roundtrip: both sides run identical model calls (same model, build, thread count)`.
- Size bars: `xz −9e 205 KB · lmzip 86 KB` (SmolLM2-135M, 1.00 bits per byte, 8 KB/s).
- A small audio waveform card: `acm0: 2.6% smaller than FLAC −12 (12 music clips)`.

## 10. Close (~22 s)

**Narration**
> So that's Faultline: spend cheap compute to save scarce bytes and time. A seed, a hash or a small model makes the guess. An exact check keeps it honest. And a map shows where you've looked. Coming up on Adam's roadmap: streaming weights from the SSD, so a Mac can run models two to three times larger than its memory.

**Screen**
- The pixel picture from scene 1 returns; its glowing fault line stays.
- The proposer, verifier and map glyphs line up under it, each lighting on its phrase.
- Last line: `roadmap D1–D2: stream weights from SSD, run models 2–3× larger than RAM`.
- Fade to black with the music.

---

## Sources for every number
README.md status table; ROADMAP.md (A2, D1–D2, Order, and the 2026-10-25 Ornith 9B and b0 A/B notes); CLAUDE.md (greedy byte-identical rule); factory/flt.py (protect rule, drafter sources, eval); modalities/RESULTS.md; modalities/text/README.md (lmzip v3 table); modalities/audio/README.md; encoder/flt_encode.py (block layout, 3INST); encoder/hfold.py (rotation); encoder/codec_search.py and codec_contour.py (codebook search); contour/contour_search.py (selection and stop rule). Repo state as of commit 5bcfde5 (2026-10-25). Outside the repo: the Lloyd-Max 4-bit Gaussian error (0.0095) and the Gaussian rate-distortion limit `2^(−2R)`.
