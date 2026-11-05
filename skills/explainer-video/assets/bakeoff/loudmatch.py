"""loudmatch.py: clips/<engine>/<id>.wav -> page/audio/<engine>/<id>.mp3 at -20 LUFS (two-pass loudnorm, linear),
so louder engines don't win by volume. Run: python3 -I review/tts-bakeoff/loudmatch.py"""
import os, glob, json, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__))
for wav in sorted(glob.glob(f"{HERE}/clips/*/*.wav")):
    eng, cid = wav.split("/")[-2], os.path.basename(wav)[:-4]
    out = f"{HERE}/page/audio/{eng}/{cid}.mp3"; os.makedirs(os.path.dirname(out), exist_ok=True)
    pad = "apad=pad_dur=3,"                      # loudnorm needs >= 3 s to measure: pad the measuring pass only
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", pad + "loudnorm=I=-20:TP=-3:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(re.findall(r"\{[^{}]*\}", r, re.S)[-1])
    af = (f"loudnorm=I=-20:TP=-3:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", af, "-ar", "44100", "-ac", "1",
                    "-c:a", "libmp3lame", "-b:a", "96k", out], check=True)
print(len(glob.glob(f"{HERE}/page/audio/*/*.mp3")), "mp3s")
