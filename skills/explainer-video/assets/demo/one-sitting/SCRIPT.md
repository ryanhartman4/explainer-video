# One Sitting

**Takeaway.** Every frame, word and note of this film is code that a language model wrote in one sitting, and the same
thirty thousand points of light can become anything the model can explain, calculate, repair, simulate or compose.

**Viewer.** Anyone curious about what an AI model can do. No background assumed.

**Questions the film answers, in order.** Who made this? How does a language model handle words? How does it write?
Can it do mathematics? Can it write and fix software? Can it simulate physics? Can it make something beautiful? How
was this film made? What next?

**Anchor picture.** 30,000 points of light, drawn by one WebGL particle system for the whole film. Every paragraph
rearranges the same points into the thing the narrator is talking about. Labels, code and numbers sit on top in 2D.

The `> ` lines are the narration, exactly as spoken. The table under each paragraph is its beat sheet.

## 1. Nobody filmed this

> Nobody filmed this. There is no camera, no footage and no editing suite. Every frame you are watching is drawn by code, and I wrote these scenes today. I am Claude, a language model. Someone told me to go crazy, so I chose thirty thousand points of light. Here is what I can do.

| on the words | change | then on screen |
|---|---|---|
| (start) | HOLD the points spelling "Nobody filmed this." as the opening frame | points as the title |
| no camera | ADD the word "camera", struck through | title, camera |
| no footage | ADD the word "footage", struck through | title, camera, footage |
| no editing suite | ADD the words "editing suite", struck through | title, three struck words |
| drawn by code | REPLACE the title: the points fly apart into a slow globe, with the line "frame = f(time)" | globe, formula |
| I am Claude | CHANGE the points to spell "Claude" | points as "Claude", formula |
| go crazy | ADD the quoted instruction "go crazy on it" | points as "Claude", quote |
| thirty thousand points | COUNT a number up to 30,000, labelled "points of light"; REMOVE the formula | points, quote, counter |
| what I can do | REMOVE the counter and quote; the points scatter outward | points |

## 2. Words become geometry

> I begin with words. Before I can use a word, it becomes a list of numbers: a point in a space with far more dimensions than anyone can draw. Here are three of them. Words that mean similar things land near each other. Directions carry meaning too. In one early word model, the step from man to woman points much the same way as king to queen. Meaning has become geometry.

| on the words | change | then on screen |
|---|---|---|
| I begin with words | REPLACE the scatter: the points spell the word "king"; ADD the heading "Words become numbers" | heading, points as "king" |
| a list of numbers | ADD a short vector of numbers beside the word, marked as an illustration | heading, "king", vector |
| a point in a space | CHANGE the word collapses to one bright point; the other points become a faint cloud | heading, point, cloud |
| Here are three | DRAW three axes through the cloud; the camera begins a slow orbit | heading, axes, cloud |
| land near each other | CHANGE the cloud gathers into labelled clusters (animals, cities, royalty, people) | heading, axes, clusters, labels |
| man to woman | DRAW an arrow from "man" to "woman" | heading, clusters, one arrow |
| king to queen | DRAW a second arrow from "king" to "queen", close to parallel with the first | heading, clusters, two arrows |
| become geometry | HIGHLIGHT the two arrows; ADD the credit "word2vec, Mikolov et al. 2013" and the mark "illustration" | heading, clusters, arrows, credit |

## 3. One word at a time

> To write, I look back over everything said so far and weigh which earlier words matter most for the next one. That weighing is called attention. Then I score every word I know, and choose a likely one. One word. Then I do it all again. Every sentence you are hearing was written that way.

| on the words | change | then on screen |
|---|---|---|
| To write | REPLACE the clusters: the points form stacked sheets (the layers of a network); ADD a row of word tiles "Every frame is drawn by" and an empty tile | sheets, tiles, empty tile |
| weigh which earlier words | DRAW arcs from the empty tile back to each earlier word, thicker for the ones that matter | sheets, tiles, arcs |
| called attention | ADD the label "attention" on the arcs, with the credit "Vaswani et al., 2017" | sheets, tiles, arcs, label |
| score every word | ADD bars for four candidate words with their scores, marked as an illustration | sheets, tiles, arcs, bars |
| choose a likely one | MOVE the winning word "code" into the empty tile | sheets, tiles, bars |
| One word | HIGHLIGHT the filled tile; REMOVE the arcs and bars | sheets, tiles |
| all again | ADD the next words one tile at a time: ", and I wrote these scenes today" | sheets, longer row of tiles |
| written that way | HIGHLIGHT a pulse of light running up through the sheets | sheets, tiles |

## 4. Three equations

> I can do mathematics. Here are three short equations from nineteen sixty-three. Edward Lorenz stripped them down from a model of rising air. I step them forward in time, and the points trace his butterfly. Now watch two points that start one millionth apart. At first they fly together. Then they part, and here they end on opposite wings. That is chaos.

| on the words | change | then on screen |
|---|---|---|
| I can do mathematics | REPLACE the sheets: the points drift into a loose cloud; ADD the heading "Three equations" | heading, cloud |
| three short equations | ADD the three Lorenz equations, one under another | heading, equations, cloud |
| Edward Lorenz | ADD the credit "Lorenz, 1963" | heading, equations, credit, cloud |
| step them forward | CHANGE the points stream along the solution of the equations | heading, equations, flowing points |
| his butterfly | ZOOM the camera around to the two-winged view | heading, equations, butterfly |
| two points | ADD two bright markers at the same place; DIM the other points | butterfly dimmed, two markers, equations |
| one millionth apart | ADD the readout "gap" starting at 0.000001 | butterfly, markers, gap readout |
| fly together | COUNT the gap as it grows, computed from the two solutions | butterfly, markers, gap readout |
| Then they part | HIGHLIGHT the two markers pulling apart, each leaving a trail | butterfly, markers, trails, gap |
| opposite wings | HOLD with one marker on each wing | butterfly, markers, trails, gap |
| That is chaos | ADD the line "almost the same start, different futures" | butterfly, markers, line |

## 5. Find the bug

> I write software, and I repair it. This search function looks right. I ran ten thousand random tests, and nearly half failed. The loop stops one step too early, so it can miss the very item it was sent to find. One character repairs it. Now all ten thousand pass. Those tests are real. The film's own code reruns them at every render.

| on the words | change | then on screen |
|---|---|---|
| I write software | REPLACE the butterfly: ADD a code panel with a binary search, and the heading "Find the bug" | heading, code |
| ten thousand random tests | CHANGE the points into a grid of 10,000 dots, one per test; the failures turn red; COUNT the failures | heading, code, test grid, fail count |
| one step too early | HIGHLIGHT the loop condition line in the code | heading, code line lit, grid, count |
| miss the very item | ADD a five-cell example from the real tests: the search narrows to one last cell, the wanted item, and stops without checking it | heading, code, grid, count, example |
| One character | CHANGE the condition from < to <=, the new character in the accent colour | heading, fixed code, grid, count, example |
| all ten thousand pass | CHANGE the red dots turn green in a wave; COUNT passes up to 10,000 | heading, fixed code, green grid, pass count |
| tests are real | ADD the note "run by the film's own code, at every render" | heading, code, grid, count, note |

## 6. One law

> I can build a small universe. Two galaxies, thirty thousand stars, and one law: gravity. Each star feels the pull of both galactic cores. Nobody drew those long tails. They fall out of the law. Two brothers ran this kind of experiment in nineteen seventy-two, and it explained the tails that real galaxies wear.

| on the words | change | then on screen |
|---|---|---|
| a small universe | REPLACE the grid: the points become two spinning discs of stars; ADD the heading "One law" | heading, two galaxies |
| thirty thousand stars | COUNT the star count to 30,000 | heading, galaxies, count |
| one law | ADD the law of gravity as a formula | heading, galaxies, count, formula |
| pull of both | DRAW two lines from one marked star to the two cores | heading, galaxies, formula, pull lines |
| those long tails | ZOOM the camera back as the galaxies pass and throw out tails | heading, galaxies with tails, formula |
| out of the law | HIGHLIGHT the formula | heading, tails, formula |
| Two brothers | ADD the credit "Toomre and Toomre, 1972" | heading, tails, formula, credit |
| real galaxies wear | ADD the note "as in the Antennae galaxies" | heading, tails, formula, credit, note |

## 7. Only because it is beautiful

> Some things I make only because they are beautiful. Turn each new seed by the golden angle, about one hundred thirty-seven and a half degrees, step it outward, and a sunflower appears. The rule never mentions a seed's neighbours. And since there is time, a poem. Thirty thousand lights. None of them knows the picture. Still, the flower blooms.

| on the words | change | then on screen |
|---|---|---|
| Some things I make | REPLACE the galaxies: the points fall inward to one small glowing core | core |
| each new seed | ADD the first seeds one at a time, each turned from the last, with the turn drawn as an arc | core, first seeds, arc |
| the golden angle | COUNT the angle readout to 137.5 degrees | seeds, arc, angle |
| a sunflower appears | CHANGE all 30,000 seeds grow outward into the full spiral head; ADD the credit "Vogel, 1979" | sunflower, angle, credit |
| a seed's neighbours | ZOOM in until the crossing spirals fill the frame | spirals |
| a poem | MOVE the flat head curls up into an open three-dimensional flower; the camera tilts | flower |
| Thirty thousand lights | ADD the first line of the poem | flower, line 1 |
| None of them | ADD the second line | flower, lines 1 and 2 |
| the flower blooms | ADD the third line; the flower opens fully | flower, three lines |

## 8. How this film was made

> I did not make this alone. I split the film into scenes and handed most of them to copies of myself. They built side by side, and more copies reviewed their work. The sound is computed too. The voice is a speech model, run locally on one Mac. The music comes from a script too, note by note. This line is the film's own soundtrack, and this dot is now.

| on the words | change | then on screen |
|---|---|---|
| did not make this alone | REPLACE the flower: the points gather into one ball; ADD the heading "How this film was made" | heading, one ball |
| split the film into scenes | CHANGE the ball splits into one cluster per scene, each labelled with its scene | heading, scene clusters |
| copies of myself | ADD the count of builder agents, from the session's real record | heading, clusters, builder count |
| side by side | DRAW a progress ring around every cluster at the same time | heading, clusters, rings, count |
| reviewed their work | ADD the count of reviewer agents, and a second ring of small clusters | heading, clusters, both counts |
| sound is computed | REPLACE the clusters: the points line up as the waveform of the film's own soundtrack | heading, waveform |
| a speech model | HIGHLIGHT the voice in the waveform; ADD the label "voice: speech model, run locally" | heading, waveform, voice label |
| note by note | ADD the label "music: a score script, written today" | heading, waveform, two labels |
| own soundtrack | ZOOM out to show the whole film's waveform, end to end; ADD the credit "built on three.js, the explainer-video engine, Breeze TTS 2" | heading, whole waveform, labels, credit |
| this dot is now | ADD a bright dot on the waveform at the current time, moving with the film | heading, waveform, labels, now dot |

## 9. What next

> No camera. No footage. One sitting, and every frame of it code. I can explain, calculate, repair, simulate and compose. So here is my question for you. What should we make next?

| on the words | change | then on screen |
|---|---|---|
| No camera | REPLACE the waveform: the points return to the slow sphere; ADD the stat "0 cameras" | sphere, one stat |
| One sitting | ADD the stat "1 sitting" | sphere, two stats |
| every frame | COUNT the stats for lines written today (film.html, shared.js and the scene files only) and frames, from the session's real record | sphere, four stats |
| explain | CHANGE the points to the word clusters | clusters, stats |
| calculate | CHANGE the points to the butterfly | butterfly, stats |
| repair | CHANGE the points to the test grid | grid, stats |
| simulate | CHANGE the points to the galaxies | galaxies, stats |
| compose | CHANGE the points to the flower | flower, stats |
| my question | REMOVE the stats; the points gather toward the centre | points |
| make next | CHANGE the points spell "What should we make next?"; ADD the credit "made by Claude, in one sitting" and under it "built on three.js, the explainer-video engine, Breeze TTS 2" | closing question, credit |

## Sources

- Opening: the user's request in this session ended "go crazy on it". The film is rendered from `video/film.html` by the explainer-video plugin's `stage.js` engine; no camera footage or stock media is used.
- 30,000 points: `G3.N` in `video/stage3d.js`.
- Word vectors and the king/queen analogy: Mikolov, Yih and Zweig, "Linguistic Regularities in Continuous Space Word Representations" (2013), and Mikolov et al., word2vec (2013). The relation holds loosely (king - man + woman lands nearest queen once the three input words are excluded; the two offsets have a cosine near 0.44 in the GoogleNews vectors), hence "points much the same way". The cluster layout on screen is hand-placed and labelled as an illustration.
- Attention and next-word prediction: Vaswani et al., "Attention Is All You Need" (2017). Models score tokens (pieces of words); the film says "word" for the ear and the scores on screen are labelled as an illustration.
- Lorenz system: E. N. Lorenz, "Deterministic Nonperiodic Flow", J. Atmos. Sci. 20 (1963), a truncated model of convection. dx/dt = 10(y - x), dy/dt = x(28 - z) - y, dz/dt = xy - (8/3)z. The two-marker experiment is integrated in the film (RK4), and the film refuses to build if the markers do not end on opposite wings.
- Binary search bug: `while (lo < hi)` with an inclusive `hi` skips the last candidate; `<=` fixes it. The film runs both versions on 10,000 seeded random tests at load and shows the real counts; it refuses to build unless the fixed version passes all 10,000 and the buggy one fails between 4,000 and 5,000 ("nearly half"). The wanted item is always in the array.
- Galaxies: a restricted N-body run (massless stars around two softened point-mass cores), the method of Toomre and Toomre, "Galactic Bridges and Tails", ApJ 178 (1972), which explained tidal tails such as those of the Antennae (NGC 4038/9). Alar and Juri Toomre are brothers.
- Sunflower: Vogel, "A better way to construct the sunflower head", Math. Biosci. 44 (1979): seed n at angle n x 137.508 degrees, radius proportional to sqrt(n). Golden angle = 360(1 - 1/phi) = 137.5078 degrees. The rule places seed n from n alone; the film makes no claim about how the living plant does it.
- Credit: the frames are drawn by this session's scene files and `stage3d.js`, running on the plugin's `stage.js` engine (earlier sessions) and three.js (its authors). Scene 1 and the 3D layer were built by the lead session; scenes 2 to 9 by parallel subagents, hence "most of them".
- How the film was made: builder and reviewer agent counts, lines of code and frame count are written to `video/data/session.js` from this session's real record after the build. The voice is Breeze TTS 2 run locally through mlx-audio; the music is synthesized by `tools/make_score.py`, an arrangement written in this session for this film's nine paragraphs, played on the piano, pad and bass instruments of the plugin's `tools/make_music.py` (an earlier session). The waveform is the envelope of `video/assets/audio/mix.wav`.
- The poem is original to this film.
