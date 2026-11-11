# How an NFL offense lines up: design

## Who and where
A serious fan who knows the positions and wants to see how the pieces fit. About two minutes. Three cuts: a wide
film for a blog or a shared screen, the same wide film with captions burned in for X, and a vertical film with
captions for phone feeds. No real clips: everything is drawn.

## The anchor picture
A football field at night that fills the frame, with eleven markers that are made once and only ever moved. One
camera looks at it from two seats and swings between them:

- **The playbook view:** straight down, offense facing up the screen. Counting is done here: the eleven, the seven
  on the line, the personnel, the receivers on each side.
- **The broadcast view:** from the stands on the offense's right and a little behind it, so the offense faces right
  as it does on television. Depth is shown here: under center, shotgun, pistol, the I, and the last paragraph's
  replay of trips, bunch and empty.

The film opens on the broadcast view (the poster), rises to the playbook view for paragraphs 1 to 3, swings down for
4 and 5, rises for 6, and swings down as the back leaves the backfield, staying there to the end.

- **Five linemen:** squares. They never move.
- **The quarterback:** a dark chip marked QB. He moves between three depths.
- **The five pieces the offense places:** filled chips, lettered and coloured by job. One of them, the "joker",
  changes job during the film (slot receiver H, second tight end U, fullback FB).
- **The line of scrimmage:** one glowing accent line across the whole field.
- **Telestrator marks,** drawn on the turf in perspective: rings, a box around a group, arrows for runs and routes,
  a dimension mark for depth. A man who moves leaves a dashed trail.
- **A chip keeps its size on screen and stands a yard off the turf,** so it lifts and casts a shadow as the camera
  tilts. The nearer man is drawn over the farther one.

Where each man stands in each formation is data in `video/shared.js`. `video/field.js` draws the field and the men
on one canvas from the time alone. `video/play.js` holds what happens at each spoken phrase, in yards, so it serves
both cuts. Each film file brings its own spot table, camera seats and type.

### Wide cut, 1920 x 1080 (`video/film.html`)
44 px to the yard from above, the line of scrimmage at y 420. The broadcast seat is 23 degrees up and 18 degrees
behind square (`tv`), with a closer seat nearly square to the line for the backfield (`tvBox`).

```
chapter heading (96, 40)                              usage bars, paragraph 3: x 1060..1790, y 150..360
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
(X)     (H)        [ ][ ][ ][ ][ ](Y)                        (Z)        line of scrimmage, accent
                        (QB)
                        (RB)
FORMATION                                  ON THE LINE          PERSONNEL
Singleback                                 7  (paragraph 2)     backs / tight ends  1 1     y 784..940
(caption strip, keep clear)                                                                 y 956+
```

### Vertical cut, 1080 x 1920 (`video/film-9x16.html`)
Composed for the tall frame. The receivers stand closer in (the widest at 12.6 yards against the wide cut's 16.4),
36 px to the yard from above, the line of scrimmage at y 640. Its broadcast seat is higher (30 degrees), so the
formation's width runs up the tall frame. Under the field one large piece of type carries each beat: the personnel
number at 230 px, then the formation's name in display size while the number steps aside to a tag top right, then
the number again in the last paragraph.

```
chapter heading (72, 156)              PERSONNEL tag, top right
(X) (H)  [ ][ ][ ][ ][ ](Y)   (Z)      line of scrimmage y 640
            (QB)
            (RB)                       deepest man y 906
FORMATION
Singleback                             the type zone, y 1038..1390
(caption strip, keep clear)            y 1400+
```

## Look
`turf`, this film's own look in `video/look.css`: deep green ground with a lighter mown stripe every five yards,
chalk-white ink, a yellow accent, Space Grotesk for display. A pool of light sits over the formation, the corners
fall off, a fine grain keeps the dark gradients from banding, and the far sideline has a row of small lights. A soft
shade sits under the type at the top and the bottom of the frame.

## What each colour means
One meaning per hue, kept for the whole film. Every coloured man also carries a letter, so colour never works alone.
Green is the ground, so no player is green.

| colour | means |
|---|---|
| ink | what is fixed: the five linemen, the quarterback, field markings, text |
| blue | a wide receiver |
| coral | a tight end |
| violet | a running back or fullback |
| accent yellow | the rule and the telestrator: the line of scrimmage, the seven men on it, rings and boxes |
| muted | defenders (paragraph 6 only), captions over the readouts |

## Motifs
- **Men move, they are never redrawn.** A change of formation is the same chips travelling to new spots.
- **A change of job is a change of colour and letter in place,** with a pulse and a ripple on the turf.
- **The readouts update on the same beat as the picture,** so the name arrives with the formation it names.
- **On the line means touching the accent line.** When the count matters, the seven take an accent outline.
- **The camera moves only between paragraphs' ideas,** never during a count.

## Not in this film
Defensive fronts and coverages, motion and shifts, play calls, the history of any formation, unbalanced lines and
tackle-eligible plays. It would be a failure to show a formation with six or eight men on the line, to let a
lineman sit at the end of the line, to show a personnel number that does not match the men on screen, or to state a
usage figure without its season.
