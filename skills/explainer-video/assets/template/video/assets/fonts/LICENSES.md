# Bundled fonts

Latin subsets in WOFF2, copied unchanged from the npm packages named below. All are under the SIL Open Font License
1.1 (`OFL-1.1.txt` beside this file), which allows bundling and redistribution with software.

| Files | Family | Copyright | From |
|---|---|---|---|
| `newsreader-latin-wght-*.woff2` | Newsreader | 2020 The Newsreader Project Authors (github.com/productiontype/Newsreader) | `@fontsource-variable/newsreader@5.3.0` |
| `instrument-sans-latin-wght-*.woff2` | Instrument Sans | 2022 The Instrument Sans Project Authors (github.com/Instrument/instrument-sans) | `@fontsource-variable/instrument-sans@5.3.0` |
| `space-grotesk-latin-wght-normal.woff2` | Space Grotesk | 2020 The Space Grotesk Project Authors (github.com/floriankarsten/space-grotesk) | `@fontsource-variable/space-grotesk@5.3.0` |
| `jetbrains-mono-latin-wght-normal.woff2` | JetBrains Mono | 2020 The JetBrains Mono Project Authors (github.com/JetBrains/JetBrainsMono) | `@fontsource-variable/jetbrains-mono@5.3.0` |
| `ibm-plex-mono-latin-*.woff2` | IBM Plex Mono | 2017 IBM Corp. | `@fontsource/ibm-plex-mono@5.0.13` |
| `KaTeX_Main-*.woff2` | KaTeX Main (Computer Modern) | 2013-2020 Khan Academy and other contributors | `katex@0.16.11` (`dist/fonts/`). The package is MIT-licensed; KaTeX documents its fonts as SIL OFL 1.1. |

The subsets cover Basic Latin and Latin-1 plus common punctuation. They do not include arrows other than ↑ ↓, or
Greek and mathematical operators beyond × ÷ ± · −; `tools/check.mjs` warns when a film uses a character they lack.
