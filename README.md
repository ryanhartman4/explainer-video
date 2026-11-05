# Explainer video

A Claude Code plugin that turns a code repo, a paper or an idea into a narrated, animated explainer in the 3Blue1Brown style. Claude writes and fact-checks the script, records the narration, animates scenes that fire on spoken words, synthesizes a music bed, adds captions and renders the MP4. It has made five films, from a 1:46 chart animation with a 3D character to an 8:37 walkthrough of real code.

It holds two skills:

- **explainer-video**: the whole process, from intake questions to the final render, with the code templates and a playbook of every setting and lesson so far.
- **explainer-video-setup**: checks your Mac for what the first skill needs, installs what is missing (asking first), and proves the voice works.

## What you need

- Claude Code.
- A Mac with Apple Silicon for the free local voice (Breeze TTS 2 on MLX). On any other machine, narrate with ElevenLabs (an account and an API key).
- About 7 GB of disk for the tools and the voice model, and about 1 GB per film.

## Install

In Claude Code:

```
/plugin marketplace add ryanhartman4/explainer-video
/plugin install explainer-video@explainer-video
```

Restart Claude Code, then ask:

> Set up my Mac for explainer videos.

The setup skill runs a read-only check (`skills/explainer-video-setup/scripts/doctor.sh`), then installs only what is missing: Node, ffmpeg and uv through Homebrew, the HyperFrames CLI and its headless Chrome, a locked Python environment for the voice at `~/Developer/mlx-audio`, and the 4.6 GB voice model. It asks before each download. One step is yours: HyperFrames asks agents not to install its skills, so you run `npx --yes hyperframes@0.9.13 skills update` yourself and restart Claude Code.

Then ask for a film:

> Make a three-minute explainer video about how this repo's cache works.

Without the plugin system, copy the two folders in `skills/` into `~/.claude/skills/`.

## The voice

The local voice clones one narrator for every sentence: `skills/explainer-video/assets/voices/w_mid.wav`, a synthetic voice (not a real person's) used in films 2 to 5. Breeze TTS 2 won a bake-off against OmniVoice, Higgs TTS 3 and Qwen3-TTS, judged by ear on questions and on words with two readings ("lead", "tear"). The playbook (`skills/explainer-video/references/playbook.md`, "Local voice") has the numbers and how to rerun the bake-off when a new model comes out.

Breeze's license allows research and non-commercial use only, and the narrator clip was made with OmniVoice (CC-BY-NC). That covers personal and unmonetized videos. For a video that earns money, the playbook names the alternatives.

## Licenses and credits

- The skills, scripts and templates in this repo: MIT (see `LICENSE`).
- Three.js r160 (`skills/explainer-video/assets/template/vendor/three.min.js`): MIT, its license beside it. The first line is patched to remove a deprecation warning.
- The narrator clip: made with OmniVoice (k2-fsa, CC-BY-NC); non-commercial use.
- Downloaded at setup, under their own licenses: HyperFrames (HeyGen), Breeze TTS 2 (BreezeBlue, research and non-commercial), mlx-audio and its dependencies.
- Claw'd, the character in film 5's template, is fan art of the Claude Code terminal mascot, unaffiliated with Anthropic.
