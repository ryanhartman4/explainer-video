# How a Bloom filter works

**Takeaway.** A Bloom filter answers "is this in the set?" from a row of bits, without keeping the set. It never gives a
false no, it sometimes gives a false yes, and you choose how often.

**Viewer.** A programmer who has heard the name and never looked inside. Knows what a hash function is.

**Questions the film answers, in order.** What does it store? How do you add a word? How do you ask about one? When is
it wrong? How wrong, and what does that cost?

The `> ` lines are the narration, exactly as spoken. The table under each paragraph is its beat sheet: one row for
each change on screen, tied to the words that are being said when it happens.

## 1. The question

> Is this word in the set? To answer, you could keep every word and search them. A Bloom filter keeps none of them. It keeps only a row of bits, and it still answers, almost always correctly.

| on the words | change | then on screen |
|---|---|---|
| (start) | HOLD the question as the opening frame | question |
| keep every word | ADD a column of stored words | question, word list |
| keeps none of them | REMOVE the word list | question |
| a row of bits | ADD the row of 16 bits, all off | question, bit row |
| almost always | HIGHLIGHT the words "almost always" under the question | question, bit row, "almost always" |

## 2. Adding

> To add a word, run it through three hash functions. Each one turns the word into a position in the row, and that bit is switched on. Add cat: three bits. Add dog: three more. The words themselves are thrown away.

| on the words | change | then on screen |
|---|---|---|
| To add a word | REPLACE the question with the heading "Add a word" and the word cat | heading, cat, bit row |
| three hash functions | ADD three hash circles under the word, joined to it | heading, cat, hashes, bit row |
| a position in the row | DRAW an arrow from each hash to its bit | heading, cat, hashes, arrows, bit row |
| switched on | CHANGE those three bits to on, in cat's blue | heading, cat, hashes, arrows, bit row |
| Add cat | COUNT the bits that are on: 3 of 16 | heading, cat, hashes, arrows, bit row, count |
| Add dog | REPLACE cat with dog; the arrows swing to dog's bits | heading, dog, hashes, arrows, bit row, count |
| three more | CHANGE dog's three bits to on, in green; COUNT to 6 | heading, dog, hashes, arrows, bit row, count |
| thrown away | REMOVE the word and its arrows; the bits stay | heading, hashes, bit row, count |

## 3. Asking

> To ask about a word, hash it the same way and look at its three bits. Owl lands on a bit that is still off. Nothing ever switched it on, so owl was never added. That answer is always right.

| on the words | change | then on screen |
|---|---|---|
| To ask about a word | REPLACE the heading with "Ask about a word"; ADD the word owl with a question mark | heading, owl?, hashes, bit row |
| look at its three bits | DRAW arrows from the hashes to owl's bits | heading, owl?, hashes, arrows, bit row |
| still off | HIGHLIGHT the bit that is off | heading, owl?, hashes, arrows, bit row |
| never added | ADD the verdict "definitely not" | heading, owl?, hashes, arrows, bit row, verdict |
| always right | HIGHLIGHT "definitely" in the verdict | heading, owl?, hashes, arrows, bit row, verdict |

## 4. The catch

> But try emu. All three of its bits are on, switched on by cat and by dog between them. The filter says yes, and it is wrong. That is the price: a yes only means probably.

| on the words | change | then on screen |
|---|---|---|
| But try emu | REPLACE owl with emu; REMOVE the verdict; the arrows swing to emu's bits | heading, emu?, hashes, arrows, bit row |
| All three | HIGHLIGHT emu's three bits | heading, emu?, hashes, arrows, bit row |
| by cat and by dog | ADD the names cat and dog under the bits each one switched on | heading, emu?, hashes, arrows, bit row, names |
| says yes | ADD the verdict "yes" | heading, emu?, hashes, arrows, bit row, names, verdict |
| it is wrong | CHANGE the verdict to "yes" struck through, in red, with "false positive" | heading, emu?, hashes, arrows, bit row, names, verdict |
| only means probably | CHANGE the verdict to "probably yes" | heading, emu?, hashes, arrows, bit row, names, verdict |

## 5. The trade

> How often? You choose. With ten bits per word and seven hashes, fewer than one answer in a hundred is a false yes. A million words fit in just over a megabyte, however long the words are.

| on the words | change | then on screen |
|---|---|---|
| How often | ADD the chart's axes: false-yes rate against bits per word | heading, axes |
| You choose | DRAW the curve falling as the bits grow | heading, axes, curve |
| ten bits per word | ADD a dot on the curve at ten bits, with a drop line | heading, axes, curve, dot |
| fewer than one | COUNT the rate up to 0.82% beside the dot | heading, axes, curve, dot, rate |
| A million words | ADD the sum: 1,000,000 words times 10 bits | heading, axes, curve, dot, rate, sum |
| just over a megabyte | ADD the result: 1.25 MB | heading, axes, curve, dot, rate, sum |

## 6. The close

> Never a false no. Sometimes a false yes. And you set how often.

| on the words | change | then on screen |
|---|---|---|
| Never a false no | ADD the first line above the bit row | bit row, line 1 |
| Sometimes a false yes | ADD the second line | bit row, lines 1 and 2 |
| you set how often | ADD the third line and the source note | bit row, three lines, note |

## Sources

- False-yes rate: p = (1 - e^(-k n / m))^k (Bloom 1970; the standard approximation). With m / n = 10 and k = 7: (1 - e^(-0.7))^7 = 0.0082.
- A million words at 10 bits each: 10,000,000 bits = 1,250,000 bytes = 1.25 MB.
- The toy filter on screen (16 bits, 3 hashes) is computed in `video/film.html` from a real hash (FNV-1a with three seeds); the film refuses to build if cat, dog, owl and emu do not behave as the narration says.
