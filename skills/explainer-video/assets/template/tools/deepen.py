# deepen.py in.wav out.wav semitones formant_ratio : PSOLA pitch shift (Praat) with a separate formant shift
import sys, parselmouth
from parselmouth.praat import call
src, dst, st, fr = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
snd = parselmouth.Sound(src)
pitch = snd.to_pitch()
med = call(pitch, "Get quantile", 0, 0, 0.5, "Hertz")
out = call(snd, "Change gender", 75, 300, fr, med * 2 ** (st / 12), 1.0, 1.0)
out.save(dst, "WAV")
print(f"median f0 {med:.1f} Hz -> {med * 2 ** (st / 12):.1f} Hz, formants x{fr}")
