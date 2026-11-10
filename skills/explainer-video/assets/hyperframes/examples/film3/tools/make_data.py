"""make_data.py: scene data for the steering explainer, from the real files only. Writes video/data/data.js as window.SX.

  uv run --no-project --python 3.12 python -I tools/make_data.py

- code: excerpts cut from steer/steer.py and steer/ablate.py by line range (an elided range becomes one "…" line), and
  one line of transformers' Qwen3.5 MLP.
- runs: the rollouts, lenses, d4 and activation lines of runs S, A1, A2 (steer/results/*.md), parsed, never retyped.
- film2: N2742's weight links and the lens tokens of N2742, N5344 and N8347, from film 2's data.js (its cache reads).
- measure: tools/measure.py's per-neuron L27 activations with and without the push.
- env: hardware, model and environment facts with their sources (SCRIPT.md, "Sources for every number").
"""
import ast
import json
import os
import re

HOME = os.path.expanduser("~")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEER = f"{HOME}/Desktop/Apps/neuron-explorer-explainer/steer"
FILM2 = f"{HOME}/Desktop/Apps/neuron-explorer-explainer/video/data/data.js"
QWEN = f"{HOME}/Desktop/Apps/neuron-explorer/.venv/lib/python3.12/site-packages/transformers/models/qwen3_5/modeling_qwen3_5.py"
RUNS = {"S": "20261029-154950.md", "A1": "20261029-155207-ablate.md", "A2": "20261029-161114-ablate.md"}

# (file, first line, last line, elided ranges) -> what each code panel shows
EXCERPTS = {
    "load": ("steer.py", 84, 89, []),
    "greedy": ("steer.py", 92, 94, []),
    "hook": ("steer.py", 77, 81, []),
    "pre": ("steer.py", 68, 75, []),
    "resid_p50": ("steer.py", 97, 109, [(98, 100)]),
    "stack": ("steer.py", 185, 187, []),
    "logit_lens": ("steer.py", 112, 116, []),
    "distinct4": ("steer.py", 119, 123, []),
    "random_direction": ("steer.py", 39, 51, [(40, 48)]),
    "most_moved": ("ablate.py", 32, 43, [(33, 34)]),
    "rows_mask": ("ablate.py", 84, 91, []),
    "delta_rank": ("ablate.py", 108, 109, []),
}


def excerpt(name, a, b, elide):
    src = open(f"{STEER}/{name}").read().split("\n")
    lines, n = [], a
    while n <= b:
        cut = next((e for e in elide if e[0] == n), None)
        if cut:
            lines.append({"n": None, "t": "…"})
            n = cut[1] + 1
            continue
        lines.append({"n": n, "t": src[n - 1]})
        n += 1
    return {"file": f"steer/{name}", "a": a, "b": b, "lines": lines}


def toks(s):
    """the Python string literals in s, evaluated (token reprs as the scripts printed them)"""
    return [ast.literal_eval(m) for m in re.findall(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"", s)]


def unfence(path):
    """the results file with each ````text rollout replaced by §k§ (rollouts hold their own # headings and ```
    fences, which must not split sections), and the rollouts"""
    texts = []

    def keep(m):
        texts.append(m.group(1))
        return f"\n§{len(texts) - 1}§\n"
    return re.sub(r"\n````text\n(.*?)\n````\n", keep, open(path).read(), flags=re.S), texts


def blocks(sec, texts):
    """**label …** · stats, then a rollout: [(label line, stats, text)]"""
    return [(lab, st, texts[int(k)]) for lab, st, k in re.findall(r"\*\*(.+?)\*\*([^\n]*)\n\n§(\d+)§", sec)]


def parse_steer(path):
    md, texts = unfence(path)
    out = {}
    for sec in re.split(r"\n(?=## )", md)[1:]:
        name = sec.split("\n", 1)[0][3:].strip()            # "L22 N2742+"
        unit = float(re.search(r"Dose unit (\d+\.\d+)", sec).group(1))
        lens = {m[0]: toks(m[1]) for m in re.findall(r"^- \*\*(.+?)\*\*: (.+)$", sec, re.M)}
        prompts = {}
        for ps in re.split(r"\n(?=### )", sec)[1:]:
            key = ps.split("\n", 1)[0][4:].split(" · ")[0]
            rows = []
            for label, stats, text in blocks(ps, texts):
                parts = label.split()
                rows.append({"label": " ".join(parts[:-1]), "dose": 0.0 if parts[-1] == "0" else float(parts[-1]),
                             "d4": float(re.search(r"d4 ([\d.]+)", stats).group(1)), "text": text})
            prompts[key] = rows
        out[name] = {"unit": unit, "lens": lens, "prompts": prompts}
    return out


def parse_ablate(path):
    md, texts = unfence(path)
    head = md.split("\n\n", 2)[1].split(". Greedy")[0]
    out = {"head": head, "prompts": {}}
    for sec in re.split(r"\n(?=## )", md)[1:]:
        key = sec.split("\n", 1)[0][3:].split(" · ")[0]
        m = re.search(r"on the prompt: ([+-][\d.]+) → ([+-][\d.]+) under the push, rank (\d+) of (\d+)", sec)
        top = []
        for t in re.findall(r"^- `N(\d+)([+−])\s+Δ ([+-][\d.]+)\s+lens (.+)`$", sec, re.M):
            top.append({"n": int(t[0]), "pole": t[1], "delta": float(t[2]), "lens": toks(t[3])})
        rows = []
        for label, stats, text in blocks(sec, texts):
            st = dict(re.findall(r"(\w+) ([\d.]+)", stats))
            rows.append({"label": label, "name": int(st.get("extrali", 0)), "theme": int(st["theme"]),
                         "d4": float(st["d4"]), "text": text})
        out["prompts"][key] = {"base": float(m.group(1)), "pushed": float(m.group(2)), "rank": int(m.group(3)),
                               "of": int(m.group(4)), "top": top, "rows": rows}
    return out


film2 = json.loads(re.search(r"window\.NX = (.*);\s*$", open(FILM2).read(), re.S).group(1))
nx = film2["neurons"]
meas = json.load(open(f"{ROOT}/video/data/measure.json"))
measure = {}
for p, v in meas["prompts"].items():
    delta = [round(b - a, 3) for a, b in zip(v["base"], v["pushed"])]
    measure[p] = {"delta": delta, "base": v["base"][meas["neuron"]], "pushed": v["pushed"][meas["neuron"]]}

qsrc = open(QWEN).read().split("\n")
qwen_line = qsrc[817].strip()
assert "bias=False" in qwen_line and "down_proj" in qwen_line, qwen_line
# the decoder layer's MLP step: the MLP's output is added to the residual with nothing scaling it (lines 896-898)
qwen_mlp = {"file": "transformers/models/qwen3_5/modeling_qwen3_5.py", "a": 896, "b": 898,
            "lines": [{"n": n, "t": qsrc[n - 1][8:]} for n in range(896, 899)]}
assert qwen_mlp["lines"][2]["t"].strip() == "hidden_states = residual + hidden_states", qwen_mlp

data = {
    "source": "steer/*.py and steer/results/*.md in neuron-explorer-explainer (2026-10-29); film 2 data.js; tools/measure.py",
    "code": {k: excerpt(*v) for k, v in EXCERPTS.items()},
    "qwen_line": {"file": "transformers/models/qwen3_5/modeling_qwen3_5.py", "n": 818, "t": qwen_line},
    "qwen_mlp": qwen_mlp,
    "prompts": {"who": "Who are you?", "snake": "Write a snake game in Python.", "orange": "Describe the color orange."},
    "terminal": [
        {"cmd": "cat ~/.cache/uv/archive-v0/…/torch-2.14.1.dist-info/WHEEL", "out": [["Tag: cp312-cp312-macosx_14_0_arm64", ""]]},
        {"cmd": "uv sync --offline", "out": [["Using CPython 3.14.1", ""],
                                              ["× Failed to download `torch==2.14.1`", "red"],
                                              ["  … torch-2.14.1-cp314-cp314-macosx_14_0_arm64.whl", "red"]]},
        {"cmd": "uv sync --offline --python 3.12", "out": [["Using CPython 3.12.12", ""], ["Resolved 96 packages in 0.77ms", ""],
                                                            ["Installed 71 packages in 535ms", "green"]]},
    ],
    "run_cmd": "uv run --frozen --project ~/Desktop/Apps/neuron-explorer python steer/steer.py",
    "env": {"mem_gb": 32, "chip": "Apple M5", "gpu_cores": 10, "params_b": 4.66, "params_lm_b": 4.21, "params_vision_b": 0.33,
            "params_mtp_b": 0.12, "model_gb": 9.32, "model_gib": 8.68, "mem_fill": 0.271,
            "shards_gb": [5.33, 3.99], "load_s": "6–8", "batch_s": 14, "batch_rows": 7, "batch_tokens": 80,
            "torch": "2.14.1", "transformers": "5.20.1", "packages": 71, "install_ms": 535,
            "venv": "~/Desktop/Apps/neuron-explorer/.venv"},
    "lyra": {"unit_L22_2M": 25.4, "calib": {"band": "0.75–1.0×", "neurons": 0.61, "random": 0.80},
             "quote_add": "Additive at mlp_out is exactly \u2018add v to neuron n\u2019s activation\u2019",
             "quote_add_note": "on models with no FFN layer scale; Qwen3.5-4B has none",
             "quote_method": "Leads to check, never circuits. Verify any claimed path with activations under ablation",
             "quote_clamp": "A directional clamp along W_down[:, n] at mlp_out is not neuron ablation"},
    "runs": {"S": parse_steer(f"{STEER}/results/{RUNS['S']}"), "A1": parse_ablate(f"{STEER}/results/{RUNS['A1']}"),
             "A2": parse_ablate(f"{STEER}/results/{RUNS['A2']}")},
    "run_files": RUNS,
    "film2": {"links_2742_down": film2["links"]["L22N2742"]["down"],
              "lens": {"N2742_logit_up": nx["L22N2742"]["logit_up"], "N2742_steer_up": nx["L22N2742"]["steer_up"],
                       "N5344_logit_down": nx["L22N5344"]["logit_down"], "N5344_steer_down": nx["L22N5344"]["steer_down"],
                       "N8347_logit_down": nx["L27N8347"]["logit_down"]},
              "cells": {k: {"row": v["row"], "col": v["col"]} for k, v in nx.items()}},
    "measure": measure,
}

# checks that the script's claims hold in the parsed data
S, A1, A2 = data["runs"]["S"], data["runs"]["A1"], data["runs"]["A2"]
who = {r["label"]: r for r in A1["prompts"]["who"]["rows"]}
assert "Extracell" in who["push, N8347 zeroed"]["text"], "Extracell"
for p in ("who", "orange", "snake"):
    rows = {r["label"]: r["text"] for r in A1["prompts"][p]["rows"]}
    assert rows["N8347 zeroed alone"] == rows["baseline"], f"N8347 alone differs from baseline on {p}"
    assert A1["prompts"][p]["rank"] == 1, p
assert data["film2"]["links_2742_down"][0]["n"] == 8347
os.makedirs(f"{ROOT}/video/data", exist_ok=True)
with open(f"{ROOT}/video/data/data.js", "w") as f:
    f.write("// generated by tools/make_data.py from the real files; do not edit\n")
    f.write("window.SX = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
print("wrote video/data/data.js", os.path.getsize(f"{ROOT}/video/data/data.js") // 1024, "KB")
for k, v in A1["prompts"].items():
    print(k, "N8347", v["base"], "->", v["pushed"], "rank", v["rank"], "| rows:", [r["label"] for r in v["rows"]][:3], "…")
