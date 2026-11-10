#!/bin/bash
# doctor.sh: report what the explainer-video skill needs on this machine, with the fix for each missing item.
# Read-only: it installs and downloads nothing. Exit 0 when every required item is present, 1 otherwise.
#   bash doctor.sh
# The local voice's uv project defaults to ~/Developer/mlx-audio (override with EXPLAINER_TTS_PROJECT).

TTS="${EXPLAINER_TTS_PROJECT:-$HOME/Developer/mlx-audio}"
HF_HUB="${HF_HOME:-$HOME/.cache/huggingface}/hub"
HYPERFRAMES_VERSION=0.9.13
fail=0

ok()   { printf "  ok       %-26s %s\n" "$1" "$2"; }
miss() { printf "  MISSING  %-26s %s\n" "$1" "$2"; fail=1; }
note() { printf "  note     %-26s %s\n" "$1" "$2"; }

echo "explainer-video doctor"
echo

echo "Platform"
local_voice=0
if [ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ]; then
  ok "Apple Silicon Mac" "macOS $(sw_vers -productVersion)"; local_voice=1
else
  note "platform" "$(uname -s) $(uname -m): the local voice (Breeze on MLX) needs an Apple Silicon Mac; narrate with ElevenLabs"
fi
free_gb=$(df -g "$HOME" 2>/dev/null | awk 'NR == 2 { print $4 }'); [ -n "$free_gb" ] || free_gb=$(df -k "$HOME" | awk 'NR == 2 { print int($4 / 1048576) }')
if [ "${free_gb:-0}" -ge 15 ]; then ok "free disk" "${free_gb} GB"; else note "free disk" "${free_gb} GB: setup needs about 7 GB, each film about 1 GB"; fi
echo

echo "Command-line tools"
if command -v brew >/dev/null 2>&1; then ok "Homebrew" "$(brew --version 2>/dev/null | awk 'NR == 1 { print $2 }')"
else note "Homebrew" "not found: the easiest way to install the tools below (https://brew.sh)"; fi

if command -v node >/dev/null 2>&1; then
  v=$(node -v); major=${v#v}; major=${major%%.*}
  if [ "$major" -ge 20 ]; then ok "Node" "$v"; else miss "Node" "$v is too old, need 20 or newer: brew install node"; fi
else miss "Node" "not found: brew install node"; fi

if command -v ffmpeg >/dev/null 2>&1; then
  if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libmp3lame; then ok "ffmpeg" "$(ffmpeg -version | awk 'NR == 1 { print $3 }')"
  else miss "ffmpeg" "built without libmp3lame: brew install ffmpeg"; fi
else miss "ffmpeg" "not found: brew install ffmpeg"; fi

if command -v uv >/dev/null 2>&1; then ok "uv" "$(uv --version | awk '{ print $2 }')"
else miss "uv" "not found: brew install uv"; fi

# macOS ships a /usr/bin/git stub that opens an install dialog until the command-line tools exist: ask xcode-select first
if [ "$(uname -s)" = Darwin ] && ! xcode-select -p >/dev/null 2>&1; then
  note "git" "Xcode command-line tools not installed: only needed to clone a repo you explain (xcode-select --install)"
elif command -v git >/dev/null 2>&1; then ok "git" "$(git --version | awk '{ print $3 }')"
else note "git" "not found: only needed to clone a repo you explain"; fi
echo

echo "Chrome (draws the frames)"
chrome=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" /usr/bin/google-chrome /usr/bin/chromium /usr/bin/chromium-browser; do
  [ -x "$c" ] && [ -z "$chrome" ] && chrome="$c"
done
for d in "$HOME/Library/Caches/ms-playwright"/chromium-* "$HOME/.cache/ms-playwright"/chromium-* "$HOME/.cache/hyperframes/chrome/chrome-headless-shell"; do
  [ -d "$d" ] && [ -z "$chrome" ] && chrome="$d"
done
if [ -n "$chrome" ]; then ok "Chrome" "$chrome"
else miss "Chrome" "none found: install Google Chrome, or  npx playwright install chromium  (about 150 MB)"; fi
note "playwright-core" "each film project needs it once (8 MB, no browser download): npm install --save-dev playwright-core. The project's own  node tools/doctor.mjs  checks it."
echo

echo "HyperFrames (optional: the back-up engine, for a 3D character or to revise films 1 to 5)"
cli=""
for d in "$HOME"/.npm/_npx/*/node_modules/hyperframes; do
  [ -f "$d/package.json" ] && grep -q "\"version\": *\"$HYPERFRAMES_VERSION\"" "$d/package.json" && cli="$d"
done
if [ -n "$cli" ]; then ok "CLI $HYPERFRAMES_VERSION" "in the npx cache"
else note "CLI $HYPERFRAMES_VERSION" "not downloaded (about 120 MB): npx --yes hyperframes@$HYPERFRAMES_VERSION doctor"; fi

if [ -d "$HOME/.cache/hyperframes/chrome/chrome-headless-shell" ]; then ok "headless Chrome" "~/.cache/hyperframes/chrome"
else note "headless Chrome" "not downloaded (about 190 MB): npx --yes hyperframes@$HYPERFRAMES_VERSION browser ensure"; fi

for s in hyperframes hyperframes-cli; do
  found=""
  for d in "$HOME/.claude/skills/$s" "$HOME/.agents/skills/$s"; do [ -f "$d/SKILL.md" ] && found="$d"; done
  if [ -z "$found" ] && [ -d "$HOME/.claude/plugins/cache" ]; then
    found=$(find "$HOME/.claude/plugins/cache" -maxdepth 6 -path "*/skills/$s/SKILL.md" -print -quit 2>/dev/null)
  fi
  if [ -n "$found" ]; then ok "skill: $s" "installed"
  else note "skill: $s" "not installed: the user runs  npx --yes hyperframes@$HYPERFRAMES_VERSION skills update  (then restarts Claude Code)"; fi
done
echo

echo "Local voice (Breeze TTS 2 through mlx-audio)"
if [ "$local_voice" = 1 ]; then
  if [ -f "$TTS/pyproject.toml" ]; then
    if grep -q '"mlx-audio==0.6.4"' "$TTS/pyproject.toml"; then ok "uv project" "$TTS"
    else note "uv project" "$TTS exists but does not pin mlx-audio==0.6.4; compare it with the setup skill's tts-env/pyproject.toml"; fi
    if command -v uv >/dev/null 2>&1 && uv run --no-sync --project "$TTS" python -c "import mlx_audio, librosa, soundfile" >/dev/null 2>&1; then
      ok "packages" "mlx-audio, librosa, soundfile import"
    else miss "packages" "not installed (about 1.2 GB): uv sync --project $TTS --frozen"; fi
  else miss "uv project" "$TTS missing: copy the setup skill's tts-env/pyproject.toml, uv.lock and .python-version there, then uv sync --project $TTS --frozen"; fi
  model=""
  for f in "$HF_HUB"/models--mlx-community--Breeze-TTS-2-mlx-8bit/snapshots/*/model.safetensors; do [ -s "$f" ] && model="$f"; done
  if [ -n "$model" ]; then ok "Breeze model" "mlx-community/Breeze-TTS-2-mlx-8bit"
  else miss "Breeze model" "not downloaded (4.6 GB): uv run --project $TTS hf download mlx-community/Breeze-TTS-2-mlx-8bit"; fi
else
  note "local voice" "skipped on this platform"
fi
echo

echo "Optional"
note "ElevenLabs" "only for the ElevenLabs voice: an account and API key, set up per film (the playbook, "Voice")"
echo
if [ "$fail" = 0 ]; then echo "Everything required is here."; else echo "Fix the MISSING items in the order listed, asking the user before each install or download."; fi
exit "$fail"
