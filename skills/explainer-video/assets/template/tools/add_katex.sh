#!/bin/sh
# add_katex.sh: put KaTeX 0.16.11 (math typesetting, MIT; about 1.5 MB from the npm registry) in video/assets/katex/.
# Ask the user before running it: it is a download. Then add these two lines to film.html's <head>, before stage.js:
#   <link rel="stylesheet" href="assets/katex/katex.min.css">
#   <script src="assets/katex/katex.min.js"></script>
# and use scene.tex("\\frac{a}{b}", { x, y, size }).
set -e
cd "$(dirname "$0")/.."
T=$(mktemp -d)
(cd "$T" && npm pack katex@0.16.11 --silent >/dev/null && tar -xzf katex-0.16.11.tgz)
mkdir -p video/assets/katex/fonts
cp "$T/package/dist/katex.min.js" "$T/package/dist/katex.min.css" video/assets/katex/
cp "$T"/package/dist/fonts/*.woff2 video/assets/katex/fonts/
rm -rf "$T"
echo "video/assets/katex/: katex.min.js, katex.min.css, fonts/ (woff2)"
