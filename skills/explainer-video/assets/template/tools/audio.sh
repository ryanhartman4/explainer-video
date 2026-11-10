#!/bin/sh
# audio.sh [semitones] [formant_ratio]: everything between a voice take and a render, in the one safe order.
#   voice post (EQ, -20 LUFS) -> real clips cut (only when SCRIPT.md has @clip lines) -> clock (word times) -> captions -> sound hits read from the film -> music bed ->
#   hits synthesized -> mix -> loudness report -> glitch screen (local voice)
# Run it after a new take, after a change to SCRIPT.md, or after moving a film.hit(). With no take yet it still
# builds music and a music-only mix, so the preview and a draft render have sound. Arguments go to voice_post.sh.
# The first run fetches numpy and scipy through uv (about 60 MB) unless uv has them cached: ask the user first.
set -e
cd "$(dirname "$0")/.."
PY="uv run -q --python 3.12 --with numpy --with scipy python -I"
if ls narration/audio/s[0-9][0-9].mp3 >/dev/null 2>&1; then sh tools/voice_post.sh "${1:-0}" "${2:-1.0}" > /dev/null; fi
if grep -q '^@clip' SCRIPT.md 2>/dev/null; then $PY tools/clips.py; fi
node tools/clock.mjs
node tools/hits.mjs
$PY tools/make_music.py video/data/timing.js video/assets/audio/music.wav
if [ -s video/data/hits.json ] && [ "$(cat video/data/hits.json)" != "[]" ]; then
  $PY tools/make_hits.py video/data/hits.json video/data/timing.js video/assets/audio/hits.wav
else rm -f video/assets/audio/hits.wav; fi
$PY tools/mix.py
echo "loudness of the mix (with a voice, about -18 LUFS is right for a blog cut; a draft with no voice reads lower and that is expected; master the X cut to -16 with tools/master_x.sh IN OUT):"
ffmpeg -hide_banner -nostats -i video/assets/audio/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -A16 "Summary" | grep -E "I:|Peak:" | sed 's/^ */  /'
if ls narration/audio/s[0-9][0-9].json >/dev/null 2>&1; then uv run -q --python 3.12 python -I tools/glitch.py | grep -E "sentences|check" || true; fi
