"""measure.py: the push's effect on every neuron of the ablated layer, for the dot plot (scenes 14 and 16). One prefill
per prompt with two rows, pushed and not, through steer.py's own hooks; no generation.

  NX=~/Desktop/Apps/neuron-explorer; STEER=~/Desktop/Apps/neuron-explorer-explainer/steer
  uv run --frozen --project $NX python tools/measure.py $STEER video/data/measure.json

Writes, per prompt, the mean activation of each L27 neuron over the prompt's tokens (first token skipped) with and
without N2742's +0.8 push, as ablate.py measures it (its `acts`), rounded to 4 decimals.
"""
import json
import sys

import torch

sys.path.insert(0, sys.argv[1])
from steer import PROMPTS, Steer, chat_ids, load, resid_p50  # noqa: E402

PUSH, DOSE, LAYER, NEURON = (22, 2742, 1), 0.8, 27, 8347

torch.set_grad_enabled(False)
tok, model, lm, dev = load()
steer = Steer(lm)
pl, pn, pole = PUSH
d = lm.layers[pl].mlp.down_proj.weight[:, pn].float()
push = pole * DOSE * resid_p50(tok, lm, pl, dev) * d / d.norm()
steer.vecs = {pl: torch.stack([torch.zeros_like(push), push])}
out = {"push": f"L{pl} N{pn}+ {DOSE:+.1f}", "layer": LAYER, "neuron": NEURON, "prompts": {}}
for p in ("who", "orange", "snake"):
    steer.grab = {LAYER: None}
    lm(input_ids=torch.tensor([chat_ids(tok, PROMPTS[p])] * 2, device=dev), use_cache=False)
    base, pushed = steer.grab[LAYER][0], steer.grab[LAYER][1]
    delta = pushed - base
    rank = int((delta.abs() > delta[NEURON].abs()).sum()) + 1
    out["prompts"][p] = {"base": [round(float(x), 4) for x in base], "pushed": [round(float(x), 4) for x in pushed]}
    print(p, f"N{NEURON}: {float(base[NEURON]):+.3f} -> {float(pushed[NEURON]):+.3f}, rank {rank}",
          f"| median |delta| {float(delta.abs().median()):.4f}, p99 {float(delta.abs().quantile(0.99)):.3f}")
with open(sys.argv[2], "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("wrote", sys.argv[2])
