#!/bin/sh
# rebuild.sh (film 5, continuous films: tools/build.mjs is a copy of build_continuous.mjs; hits.mjs mounts compositions/film.html):
# everything after a new voice take or a change to the film's timing, in the one order that keeps sound
# and picture on one clock (PLAYBOOK.md "Sound hits on one clock"):
#   voice post -> clock -> captions -> hits read from the film -> music + hits synthesized -> clock again (index.html
#   picks up the audio) -> glitch screen.
# Run from anywhere: sh tools/rebuild.sh
set -e
cd "$(dirname "$0")/.."
PY="uv run -q --python 3.12 --with numpy --with scipy python -I"
sh tools/voice_post.sh 0 > /dev/null
node tools/build.mjs > /dev/null
node tools/captions.mjs
node tools/hits.mjs
$PY tools/make_music.py video/data/timing.js video/assets/audio/music.wav
$PY tools/make_hits.py video/data/hits.json video/data/timing.js video/assets/audio/hits.wav
node tools/build.mjs
uv run -q --python 3.12 python -I tools/glitch.py | grep -E "sentences|check" || true
