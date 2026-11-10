#!/bin/sh
# voice_post.sh [semitones] [formant_ratio]: narration/audio/sNN.mp3 -> narration/audio/final/sNN.mp3
# The default, 0, skips the pitch shift (local voices are designed or cloned at the pitch you want).
# Deepens the ElevenLabs voice (Praat PSOLA, timing unchanged), takes out the boom the deepening adds, and
# normalizes each scene to -20 LUFS (at -16 the bass was too much for the author's speakers; the music level is set
# against this in tools/mix.py, or in tools/build.mjs with the HyperFrames back-up engine).
# The author picked "Eric, a little deeper": -1.5 semitones, formants x0.97 (version a); -3 / 0.94 was version b.
set -e
cd "$(dirname "$0")/../narration/audio"
ST=${1:-0}; FR=${2:-1.0}
mkdir -p final
for f in s[0-9][0-9].mp3; do
  n=${f%.mp3}
  ffmpeg -hide_banner -loglevel error -y -i "$f" -ac 1 -ar 44100 "final/$n.in.wav"
  if [ "$ST" = "0" ]; then   # no pitch shift (a local voice designed or cloned at the right pitch)
    cp "final/$n.in.wav" "final/$n.deep.wav"
  else
    uv run -q --python 3.12 --with praat-parselmouth python -I ../../tools/deepen.py "final/$n.in.wav" "final/$n.deep.wav" "$ST" "$FR" > /dev/null
  fi
  ffmpeg -hide_banner -loglevel error -y -i "final/$n.deep.wav" -af "highpass=f=90:poles=2,equalizer=f=170:t=q:w=1.0:g=-4,equalizer=f=3000:t=q:w=1.2:g=2,loudnorm=I=-20:TP=-3:LRA=7:linear=true" -ar 44100 -c:a libmp3lame -b:a 192k "final/$n.mp3"
  cp "$n.json" "final/$n.json"
  rm "final/$n.in.wav" "final/$n.deep.wav"
  echo "final/$n.mp3"
done
