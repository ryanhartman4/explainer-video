# The method: how to design an explainer

This is the design half of the skill: what to put on screen, in what order, and why. It applies to any engine. Read
it once before the first film, and return to section 10 whenever a contact sheet looks wrong.

The test of an explainer is one sentence: **a viewer who watches once can explain the idea to someone else.** The
method serves that test. It rests on five ideas, and everything below is one of them applied.

1. **One picture that builds.** The film is a single diagram growing step by step, not a deck of slides.
2. **The voice explains, the picture shows.** They say the same thing at the same moment in two different ways.
3. **One change at a time,** on the word that causes it.
4. **Everything on screen has a job.** A colour, a motion or a word with no meaning is noise.
5. **Look at your own frames** and fix what you see, before anyone else does.

Contents: 1 the sentence and the questions · 2 the anchor picture · 3 writing for the ear · 4 the beat sheet ·
5 layout · 6 type · 7 colour · 8 motion · 9 sound · 10 review · 11 choosing a look · 12 what bad looks like

## 1. The sentence and the questions

Write the **takeaway** first: one sentence the viewer should be able to say afterwards. "A Bloom filter never gives a
false no, sometimes gives a false yes, and you choose how often." If the sentence needs a second "and", cut scope
until it does not. Everything that does not serve the sentence is left out, however interesting.

Then write the **question ladder**: the questions this viewer would ask, in the order they would ask them, where each
answer raises the next. What does it store? How do you add something? How do you look something up? When is it
wrong? How wrong? Each question becomes one paragraph of narration. A film built on the viewer's questions feels
like it reads their mind; a film built on the subject's table of contents feels like a manual.

Decide what the viewer already knows and skip it. Explaining what they know costs their attention and buys nothing.

## 2. The anchor picture

Find the **one picture** the whole film can be told on. This is the most important design decision and it is made
before any narration is polished.

| The subject is | The anchor picture is usually |
|---|---|
| an algorithm or data structure | the structure itself, small enough to count, with one example moving through it |
| a system or a repo | one request's path through the parts, left to right |
| an argument or a forecast | one chart whose lines are the claims |
| a piece of mathematics | one geometric figure, with the equation beside it changing in step |
| a comparison | the same example done both ways, side by side, same scale |
| a history | a timeline that stays on screen while events land on it |
| code | the real code in a panel, next to what it does to the example |

Tests for a good anchor picture:
- **It is the mechanism, not a symbol of it.** A row of 16 bits that actually switch on beats an icon of a filter.
- **It is small enough to count.** 16 bits, not 1,024. Three hashes, not seven. Say the real scale once, in words.
- **Every paragraph changes it.** If a paragraph cannot be shown as a change to the picture, either the picture is
  wrong or the paragraph does not belong.
- **One concrete example runs through it.** The words "cat" and "dog", one request, one weight matrix. Abstract
  statements are made about the example the viewer is looking at.
- **It can be the last frame.** The close returns to it, complete.

Then fix the **geography**: where each part lives on the 1920 by 1080 frame, written down in DESIGN.md with
coordinates. A thing keeps its place, shape and colour for the whole film. Viewers build a map of the screen in the
first twenty seconds; every time a thing jumps to a new place, they have to rebuild it. Reserve places too: where
headings go, where the verdict or result lands, the strip left clear for captions.

Use real data. Compute what is on screen from the real thing (run the hash, read the file, sample the formula), and
have the film check the narration's claims against that data so a later edit cannot make them drift apart. Where a
picture has to be illustrative, say so on screen.

## 3. Writing for the ear

The narration is heard once, at the speaker's pace, with no way to re-read. Write it by saying it aloud.

**Structure.** Pick the template that fits and bend it:
- *How something works:* the question it answers → the obvious way and what it costs → the trick → the trick
  running on the example → where it breaks → what that costs → the takeaway, on the anchor picture.
- *An argument:* the claim → what would have to be true → the evidence, one piece per paragraph → the strongest
  objection → what would change the conclusion → the claim again, scoped to what was shown.
- *A repo or system:* what you can do with it (show it) → one input's path through it → the one clever part, slowly
  → how you would check it works → what it does not do.

**The opening** (first 8 seconds) is a question, a surprising number or a thing to picture. Never a greeting, never
"in this video". Frame 0 is also the thumbnail: it already shows the question and the key picture.

**Sentences.**
- 25 words at most; most under 15. One new term per sentence, named the moment it appears on screen.
- Concrete before abstract: show it happen to "cat", then state the rule.
- Put the word that names the new thing near the end of its sentence. The picture changes on that word, so the
  sentence builds to the change.
- Round numbers for the ear ("fewer than one in a hundred"); the exact figure goes on screen (0.82%).
- Say what something is, then what it is called. Not the reverse.
- No sentence the picture cannot show. "This is really important" has no picture; cut it.
- The close is short and returns to the takeaway in the film's own words. No "thanks for watching".

**Budget.** A voice reads about 155 words a minute, and a film adds silence around each paragraph, so a finished
film runs about 2.2 words a second: 90 seconds is about 200 words, 3 minutes about 400. `tools/script_check.mjs`
prints the length the film will really have; trust it over arithmetic. A paragraph is one idea and 10 to 25 seconds
(25 to 55 words). When the film runs long, cut a question from the ladder; do not speed up.

## 4. The beat sheet

Under each paragraph, list its **beats**: every change on screen, tied to the words spoken when it happens.
`tools/script_check.mjs` reads this table.

```
| on the words | change | then on screen |
| a position in the row | DRAW an arrow from each hash to its bit | heading, cat, hashes, arrows, bit row |
```

- **On the words:** a phrase copied exactly from the narration as it is spoken. Use two or three words so it names
  one moment. `(start)` marks the opening frame, before anyone speaks.
- **Change:** one verb, one change. The verbs are the whole vocabulary of an explainer:

| Verb | Means | Motion (section 8) |
|---|---|---|
| ADD | a new thing arrives | it rises in, pops in, or draws itself |
| DRAW | a line, arrow or curve appears | the stroke draws from its source to its target |
| MOVE | the same thing goes somewhere | it travels; it never fades out and back in elsewhere |
| CHANGE | the same thing takes a new state | its colour, label or size tweens in place |
| REPLACE | a thing gives way to its successor | old out and new in, in the same place |
| HIGHLIGHT | look here | a pulse, an underline, or everything else dims |
| DIM | this is finished but still context | it drops to 30% |
| REMOVE | this is finished | it fades out, quicker than it came in |
| COUNT | a number runs to its value | the digits count up as it is said |
| ZOOM | change of scale | the camera moves; nothing is redrawn |
| HOLD | nothing changes, on purpose | for the opening frame and for a line that needs stillness; 4 seconds at most |

- **Then on screen:** everything visible after the beat. Seven things at most. If the list keeps growing, something
  should have been removed or dimmed when the narrator finished with it.

**Pacing.** A beat every 2 to 5 seconds while the voice is speaking. More than 6 seconds without a change and the
eye wanders; two changes inside 0.7 seconds and it cannot follow either. The first beat of a paragraph lands on its
opening words. If a stretch has nothing to show, the narration there is not about the picture: rewrite or cut it.

## 5. Layout

- **The frame** is 1920 by 1080. Keep content inside x 120 to 1800 and y 96 to 984. Text never leaves x 48 to 1872,
  y 40 to 1040. If captions will be burned in, nothing sits below y 956.
- **One focal point per beat.** The eye goes to what is largest, brightest, most saturated, or moving. Only one
  thing may be that at a time: the thing the narrator is naming.
- **Left-align and top-anchor.** Headings top-left at one fixed position. Centre only a single hero element (a
  verdict, a title card). A frame where everything is centred has no structure.
- **Use the whole frame, leave a third of it empty.** Small content floating in the middle reads as a slide; content
  edge to edge reads as a wall. Size the anchor picture to span the content width, and spread the composition over
  the frame's height: something in the upper third, the picture across the middle, the result or verdict in the
  lower third. A box that holds a label is at least 96 px tall; a node in a diagram at least 120 px across.
- **Direction means something.** Time and cause run left to right or top to bottom. More is up. Before is left of
  after. Never reverse a direction mid-film.
- **Label directly.** A name sits on or beside its thing, in the thing's colour. No legends, no keys to look up.
- **Align to a few lines.** Left edges share an x; rows share a y; gaps come from a small set (16, 24, 40, 64).
  `Stage.cols()` gives evenly spaced columns.
- **Headings and counters go on the scene's `hud`** so a camera move does not drag them off the frame.

## 6. Type

Six sizes exist and no others, so hierarchy stays consistent:

| Size | px | Use |
|---|---|---|
| display | 144 | the opening question, one hero number |
| title | 96 | a verdict, a closing line |
| head | 64 | the heading of a paragraph |
| body | 44 | a sentence fragment, a labelled value, text in a chip |
| label | 34 | names on things, axis titles, annotations |
| note | 26 | sources, tick numbers, the running head |

- At most three sizes in one frame. Skip a step between neighbours (head with label, not head with body) so the
  difference reads.
- A heading is the largest text in its frame, with one exception: a single hero (the number, the verdict, the
  closing lines). If the body outweighs the heading and is not a hero, drop the heading or shrink the body.
- 26 px is the floor for anything a viewer should read; the checker rejects under 24.
- **Eight words or fewer** in any text on screen while the voice is speaking. A viewer cannot read one sentence
  while hearing another. On-screen words are labels, key terms the narrator is saying right now, and numbers.
- The display face carries ideas; the mono face carries code, numbers, identifiers and anything typed; the text
  face carries labels. Never mix them inside one line.
- Numbers use tabular figures (the `number()` node does) so they do not jiggle while counting.
- Text holds still while it is being read. Move it before or after, not during.

## 7. Colour

- A look has a ground, an ink, two greys, one accent and four hues. That is the whole palette. `muted` is for
  secondary text and for outlines the viewer should notice; `faint` is for grids, rules and empty slots that only
  need to be sensed. If an empty cell matters to the explanation, outline it in `muted`.
- **Assign each hue one meaning** in DESIGN.md and keep it all film: blue is "cat", green is "dog", accent is the
  false positive. A viewer learns the code in one beat and then reads the screen by colour alone.
- **The accent is for the one idea the film is about.** Used three times it points; used thirty times it decorates.
- Structure (boxes, arrows, axes, most text) is ink or grey. Colour is reserved for meaning.
- Never rely on red against green alone to carry a difference; pair it with a label or a shape.
- Text needs 4.5:1 contrast with what is behind it (3:1 at 32 px and up). Text on a filled shape takes the ground
  colour (`labelColor: "bg"`). The checker measures this.
- Finished-but-relevant things dim to 30% instead of disappearing; the focal thing stays at full strength.
- No gradients across large areas (they band when compressed), no glow, no drop shadows, no decorative particles.

## 8. Motion

Motion is how the picture speaks. Each kind of motion means one thing (the verb table in section 4); a motion that
means nothing is not used.

| | Seconds | Easing |
|---|---|---|
| a thing enters | 0.5 | ease out: fast start, soft landing |
| a thing leaves | 0.25 | ease in; exits are quicker than entrances |
| a thing moves or changes | 0.7 | ease in and out |
| a stroke draws | 0.8 | ease in and out |
| the camera moves | 1.2 | ease in and out |
| a number counts | 0.5 to 1.4 | ease out |
| items in a group follow each other by | 0.08 | (0.6 in total at most) |

These are the engine's defaults; leave them alone unless a beat needs otherwise.

- **Land on the word.** A change starts a tenth of a second before its cue word (`p.at()` does this), so it is
  arriving as the word is said. A picture that trails the voice feels late; one that leads by a second spoils it.
- **Same thing, same object.** When "cat" gives way to "dog", the arrows that pointed at cat's bits swing to dog's.
  Fading one set out and another in tells the viewer these are different arrows.
- **New things come from their cause.** An arrow draws from source to target; a result appears where its inputs
  met. `show(t, { from: node })` flies a thing in from the thing that produced it.
- **One hero move per beat.** If two things must change, the second follows 0.1 to 0.2 seconds later and smaller.
- **Stagger groups, never pile them.** Sixteen cells arrive in a ripple, not in one frame.
- **Stillness is allowed** for up to about 4 seconds while the viewer reads or the narrator makes a point. Do not
  add wobble to fill it; add the next beat sooner.
- **No bounce or overshoot** on diagrams, text, colour or opacity. Linear motion only for steady progress (a scan,
  a clock).
- **Use the camera sparingly:** a slow push toward the detail the narrator is on, and back out before the next
  beat. A camera that never rests is a screensaver.

## 9. Sound

- The film must work muted (many viewers start that way). Sound confirms the picture; it never carries a fact.
- Voice first. The music bed sits far under it and lifts only in gaps of two seconds or more.
- A few **hits** on picture events (a tick as each bit switches, a low thump on the turn, a chord on the close) make
  motion feel physical. Schedule each with `film.hit()` on the same line as its picture event. Fewer than one every
  three seconds. `thump` is the only loud one: use it once, on the turn of the film.
- You cannot hear. Measure loudness with the tools, and ask the user to listen for misread words.

## 10. Review: look at your own frames

Take contact sheets (`node tools/shots.mjs`) after every paragraph you build and look at them. Then run
`node tools/check.mjs`. The checker finds what can be measured; these five tests find the rest.

1. **Mute test** (`shots.mjs --film`): twelve frames of the whole film. Can a stranger follow the story from them?
   If two neighbouring frames look the same, the stretch between them has no beats.
2. **Sync test** (the paragraph sheets): under each frame is what the narrator is saying. Does the frame show that?
   The thing named in [brackets] should be on screen, and be the brightest thing there.
3. **Pause test:** take any single frame. Is it a composed picture with one focal point, aligned edges and room to
   breathe? A good film is good at every pause.
4. **Squint test:** shrink a frame to thumbnail size (the contact sheet does). Is the hierarchy still clear: one
   biggest thing, one accent, the rest quiet?
5. **Stranger test:** read only the on-screen words, in order. Do they make an outline of the film? Is any of them
   a sentence the narrator also says in full?

Open a full-size frame (`shots.mjs --at 12.4`) to judge small text and fine alignment; contact sheets are too
small for that.

| You see | The fix |
|---|---|
| two frames in a row that look the same | add a beat between them, or cut narration |
| the frame fills up as the paragraph goes on | REMOVE or DIM what the narrator has finished with |
| nothing is clearly the focal point | dim everything but the thing being named; use the accent once |
| text on text, an arrow through a label | move the label to a reserved place; bend the arrow (`bend`) |
| a thing appears in a new place after a scene change | keep one scene across those paragraphs (`film.scene(p2, p4)`) |
| small content in a big empty frame, or everything in the top half | scale the picture up to the content width; raise sizes one step; put the result in the lower third |
| a code line cut off at the panel's edge | widen the panel, lower the size, or break the line |
| the body text is bigger than the heading | drop the heading or shrink the body, unless the body is the one hero |
| the picture changes before or after its word | cue on the exact phrase; use a longer phrase if the word repeats |
| a paragraph of text on screen | cut it to the two words that matter and let the voice say the rest |
| many colours, none meaning anything | back to ink and grey; give each remaining hue one meaning |
| it looks like a slide deck | you have scenes instead of a picture: find the anchor picture (section 2) |

Review in rounds: look, write down the two or three worst things as frames and numbers ("at 0:47 the heading is cut
by the zoom"), fix those, re-shoot only those moments. Stop when a round finds nothing you would be embarrassed by.

## 11. Choosing a look

Three looks ship with the engine (`video/stage.css`). Choose by subject and viewer, state the choice in DESIGN.md,
and do not mix looks in one film.

| Look | It is | Use it for |
|---|---|---|
| `paper` | warm off-white, near-black serif headings, one vermilion accent | ideas, arguments, economics, history, product explainers, anything for a general audience. The default. |
| `slate` | deep blue-black, cool white grotesque, amber accent | code, systems, infrastructure, protocols, data pipelines |
| `chalk` | near-black, cream Computer Modern, the 3Blue1Brown palette | mathematics, machine learning, anything with equations; the house look of films 1 to 5 |

To make a new look, copy a block in `stage.css` and change the tokens: a ground, an ink at 12:1 or better against
it, a muted grey at 4.5:1, a faint grey for outlines, a panel one step off the ground, one accent, four hues each at
4.5:1 on the ground (3:1 if used only for shapes). Two typefaces at most plus a mono. Then run the demo film in it
(`node tools/shots.mjs --look yourlook`) before building on it.

## 12. What bad looks like

The failures this method exists to prevent, so you can recognise them in your own contact sheets:

- **The slide deck:** every paragraph is a new title and three bullets that the narrator reads out.
- **The lecture:** the voice explains for ten seconds while one static diagram sits there.
- **The screensaver:** everything drifts, pulses and glows, and none of it is tied to a word.
- **The dashboard:** twelve things on screen at once in six colours, all equally loud.
- **The stock look:** purple-to-blue gradients, glass cards, emoji icons, centred everything.
- **The magic trick:** the picture changes a second before the narrator gets there, or a result appears from nowhere.
- **The unverified claim:** a number on screen that nobody computed or cited.
