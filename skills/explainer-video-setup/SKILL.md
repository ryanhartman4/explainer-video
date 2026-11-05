---
name: explainer-video-setup
description: Use when getting a Mac ready to make videos with the explainer-video skill (a new machine, a first film, or after a reinstall), or when a film step fails because a tool is missing or broken - node, npx, ffmpeg, uv, the HyperFrames CLI, its headless Chrome or skills, the mlx-audio uv project at ~/Developer/mlx-audio, or the Breeze TTS model.
---

# Explainer video setup

Gets a machine ready for the `explainer-video` skill. Check first, install only what is missing, and ask the user before every install or download, naming what it is, where it comes from and its size. Never install anything the check did not report missing.

This skill's folder is called `<setup>` below; the `explainer-video` skill's folder (its sibling, `../explainer-video` from here) is `<explainer>`.

## 1. Check

```bash
bash "<setup>/scripts/doctor.sh"
```

Read-only and takes seconds. Each line is `ok`, `MISSING` (with the fix and its size) or `note`. Exit 0 means everything required is present: skip to step 3.

## 2. Fix what is missing, in this order

| Item | Fix | Size | Who runs it |
|---|---|---|---|
| Homebrew | the install line at https://brew.sh | small | the user (it needs their password) |
| Node 22+ | `brew install node` | Homebrew prints it | you, after the user's OK |
| ffmpeg (with libmp3lame) | `brew install ffmpeg` | Homebrew prints it (with dependencies) | you, after the user's OK |
| uv | `brew install uv` | Homebrew prints it | you, after the user's OK |
| HyperFrames CLI 0.9.13 | `npx --yes hyperframes@0.9.13 doctor` | about 120 MB | you, after the user's OK |
| HyperFrames headless Chrome | `npx --yes hyperframes@0.9.13 browser ensure` | about 190 MB | you, after the user's OK |
| Local voice project | see below | about 1.2 GB | you, after the user's OK |
| Breeze model | `uv run --project ~/Developer/mlx-audio hf download mlx-community/Breeze-TTS-2-mlx-8bit` (public: no Hugging Face login) | 4.6 GB | you, after the user's OK |
| HyperFrames skills | `npx --yes hyperframes@0.9.13 skills update`, then restart Claude Code | small | the user, last: HyperFrames asks agents never to install its skills, and the restart ends this session |

**Local voice project** (Apple Silicon only; the doctor skips it elsewhere). It lives at `~/Developer/mlx-audio` because the `explainer-video` skill's commands use that path.
- If the folder does not exist: `mkdir -p ~/Developer/mlx-audio`, copy `<setup>/tts-env/pyproject.toml`, `uv.lock` and `.python-version` into it, then `uv sync --project ~/Developer/mlx-audio --frozen`. The lock pins `mlx-audio==0.6.4` on Python 3.12 (uv fetches that Python if needed); torch is in it only for the optional Higgs engine.
- If the folder exists, never overwrite it. Compare its `pyproject.toml` with `<setup>/tts-env/pyproject.toml` and tell the user what differs.

Run every Python step through `uv run --project ~/Developer/mlx-audio`, never a venv's own `python`. The download commands print progress; run the 4.6 GB model download in the background.

After each fix, run the doctor again. Leave the HyperFrames skills row for the end: hand the user its command together with step 3's results, since the restart it needs ends this session.

## 3. Verify

1. `bash "<setup>/scripts/doctor.sh"` exits 0.
2. `npx --yes hyperframes@0.9.13 doctor --json` reports `"ok": true`. It always exits 0, so read the field.
3. On Apple Silicon, one sentence in the narrator's voice:
   ```bash
   uv run --project ~/Developer/mlx-audio python "<setup>/scripts/smoke_tts.py" "<explainer>/assets/voices/w_mid.wav" /tmp/narrator-check.wav
   ```
   It prints PASS or FAIL (about 6 s of audio in about 20 s on an M5). PASS means the clip has the right length and isn't silent; it cannot tell whether the voice sounds right, so send the user the clip and ask them to listen.

Then tell the user what was installed, what was skipped and why, and that `explainer-video` is ready.

## Not an Apple Silicon Mac

The local voice runs on MLX, which needs Apple Silicon. Everything else (HyperFrames, ffmpeg, uv, the tools) is cross-platform but has been tested only on macOS. Narrate with ElevenLabs instead (`explainer-video` step 4 sets up an account per film); the doctor skips the local voice checks and says so.

## Common mistakes

| Mistake | Fix |
|---|---|
| Running `npx hyperframes` without `@0.9.13` | Newer CLIs may differ from the version the skill was tested on; keep the pin. |
| `uv add` or `pip install` into `~/Developer/mlx-audio` | Use the bundled lock with `uv sync --frozen`, so every machine gets the same versions. |
| Overwriting an existing `~/Developer/mlx-audio` | Compare instead; it may be the user's own setup. |
| Installing the HyperFrames skills yourself | Name the command; the user runs it and restarts Claude Code. |
| A PASS from `smoke_tts.py` taken as "the voice is good" | It checks length and silence only. The user listens. |
| Downloading without asking | Every row in the table needs the user's OK first, with name, source and size. |
