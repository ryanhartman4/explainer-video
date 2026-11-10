# How a Bloom filter works: design

## Who and where
A programmer who has heard the name and knows what a hash function is. A blog post and X, so a second cut has
burned-in captions and nothing sits below y 956. About 95 seconds.

## The anchor picture
A row of 16 bits. One example runs through it: add "cat" and "dog", then ask about "owl" and "emu". The row arrives
in paragraph 1 and does not move until the film ends; everything else happens above it (the word, the three hashes)
or below it (the verdict).

```
heading (120, 96, on the hud)                         running head (1800, 56)
                  [ word ]                 y 130..246   one word at a time, always here
        (h1)        (h2)        (h3)       y 395        x 520, 960, 1400
[0][1][0][1][0][0][0][0][1][1][0][0][0][0][1][1]   y 640..736   x 120..1800, never moves
 0  1  2  3 ...  index numbers, or the name of the word that set the bit      y 748
                                                   count "6 of 16 bits on"    y 806, right
                  verdict                   y 838        centred, title size
(caption strip, keep clear)                 y 956+
```

Paragraph 5 is its own scene (a chart on the left, the numbers on the right). Paragraph 6 returns to the row, as
the film left it, under three closing lines.

## Look
`paper`. The subject is a data structure, but the film is an idea for a general technical reader, and the light
ground suits a blog and stands out in a feed.

## What each colour means

| colour | means |
|---|---|
| ink | structure: the word box, the hashes, a query's arrows, most text |
| blue | "cat": its arrows, the bits it switched on, its name under them |
| green | "dog": the same |
| accent (vermilion) | being wrong: "almost always", the false positive, "probably", the false-yes rate and its curve |
| muted, faint | secondary text; empty bits and rules |

## Motifs
- The same three arrows serve every word: they swing from cat's bits to dog's, and later to owl's and emu's.
- Every word appears in the same box; a query is an outline with a question mark, an added word is filled.
- Every verdict lands in the same place, in the same size.
- A soft tick as each bit switches on, rising in pitch with the bit's position; one low thump on "it is wrong".

## Not in this film
Deletion, counting filters, how to choose the hash functions, real-world uses. A failure even if it renders: any
number that the film's own code did not compute (it calls `film.problem()` if cat, dog, owl and emu stop behaving
as the narration says, or if the 0.82% stops matching the formula).
