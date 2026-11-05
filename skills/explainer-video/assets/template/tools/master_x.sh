#!/bin/sh
# master_x.sh IN.mp4 OUT.mp4 : the X master (playbook "Last mile for X"). Two-pass loudnorm to -16 LUFS, true peak -1.5,
# linear gain (no pumping), video stream copied, AAC 192k at 48 kHz, faststart (moov first, so X can start playback early).
# Prints the result's integrated loudness and peak. Written for sh: under zsh, "$X:l" in a filter string is a modifier.
set -e
IN=$1; OUT=$2
[ -n "$IN" ] && [ -n "$OUT" ] || { echo "usage: sh tools/master_x.sh IN.mp4 OUT.mp4"; exit 1; }
J=$(ffmpeg -hide_banner -nostats -i "$IN" -af loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
M=$(printf '%s' "$J" | uv run -q --python 3.12 python -I -c "import json,sys; d=json.load(sys.stdin); print(' '.join(d[k] for k in ['input_i','input_tp','input_lra','input_thresh','target_offset']))")
set -- $M
ffmpeg -v error -y -i "$IN" -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=7:measured_I=${1}:measured_TP=${2}:measured_LRA=${3}:measured_thresh=${4}:offset=${5}:linear=true" \
  -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "in: ${1} LUFS, TP ${2} -> $OUT:"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|Peak:"
