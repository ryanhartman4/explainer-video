"""make_data_repo.py REPO OUT.js : scene data that comes from running Adam's own code (needs the user's OK to execute it):
research/early/faultline.py (the edge-spending pixel coder) and contour/contour_search.py (Contour).

Run: uv run --python 3.12 --with numpy python -I tools/make_data_repo.py <faultline clone> video/data/data_repo.js"""
import sys, json, math, random, importlib.util
import numpy as np

REPO, OUT = sys.argv[1:3]

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m

r2 = lambda a, d=3: [round(float(x), d) for x in np.asarray(a).ravel()]
D = {}

# ---------------------------------------------------------------- scene 1: Adam's early edge-spending pixel coder
fl = load("faultline_early", f"{REPO}/research/early/faultline.py")
H = W = 64
yy, xx = np.mgrid[0:H, 0:W]
th = np.arctan2(yy - 31.5, xx - 33.0); rad = np.hypot(yy - 31.5, xx - 33.0)
edge = 21 + 3.2 * np.sin(3 * th + .6) + 2.0 * np.sin(5 * th - 1.1) + 1.2 * np.cos(2 * th)
img = (rad < edge).astype(np.uint8)

class Rec(fl.Enc):
    """the real arithmetic coder, also recording what each bit cost: -log2 p(actual bit)"""
    def __init__(s): super().__init__(); s.cost = []
    def bit(s, b, p0):
        p = p0 / fl.PONE; s.cost.append(-math.log2(p if b == 0 else 1 - p)); super().bit(b, p0)

L = fl._levels(H, W); rec = Rec(); dec, st = fl._run(H, W, L, 1.0, rec, img)
order = []
for name, ys, xs, _ in fl.schedule(H, W, L):
    if name == "base":
        S = 1 << L; order += [(y * S, x * S) for y in range(len(range(0, H, S))) for x in range(len(range(0, W, S)))]
    else:
        order += list(zip(ys.tolist(), xs.tolist()))
assert len(order) == H * W == len(rec.cost) and (dec == img).all()
passes = [n for n, *_ in fl.schedule(H, W, L)]
D["pixels"] = dict(w=W, h=H, img="".join(map(str, img.ravel())), order=[y * W + x for y, x in order],
                   cost=r2(rec.cost, 3), total_bits=round(sum(rec.cost), 1), raw_bits=H * W,
                   bytes=len(rec.done()) + 13, passes=passes)

# ---------------------------------------------------------------- scene 8: a real Contour run on a toy pass/fail space
cs = load("contour_search", f"{REPO}/contour/contour_search.py")
def evaluate(c):
    x, y = c["x"], c["y"]
    if x > .72 and y > .58: return (True, "oom")
    if (x - .24) ** 2 + ((y - .3) / 1.3) ** 2 < .022: return (True, "diverged")
    if y < .1 and x > .35: return (True, "slow")
    return (False, None)
dims = {"x": ("float", 0, 1), "y": ("float", 0, 1)}
Cn = cs.Contour(dims, seed=4)
side = random.Random(99)                         # own RNG for the untested share, so measuring never steers the run
def uncovered(m=300):
    T = {Cn.S.cell(r["cand"]) for r in Cn.rows}; miss = 0
    for _ in range(m):
        qc = Cn.S.cell(Cn.S.sample(side))
        if qc not in T and not any(sum(a != b for a, b in zip(qc, t)) <= 1 for t in T): miss += 1
    return miss / m
rounds, snaps = [], []
gx, gy = np.meshgrid(np.linspace(0, 1, 48), np.linspace(0, 1, 27))
while len(Cn.rows) < 160:
    for c in Cn.ask(4): Cn.tell(c, *evaluate(c))
    s = Cn.stats(); u = uncovered()
    rounds.append(dict(n=s["tests"], gt=round(s["good_turing_unseen"], 3), unc=round(u, 3), modes=s["modes"]))
    if s["tests"] in (8, 20, 40, 64) or Cn.done():
        p = [Cn.predict({"x": float(a), "y": float(b)})["p"] if isinstance(Cn.predict({"x": .5, "y": .5}), dict)
             else Cn.predict({"x": float(a), "y": float(b)})[0] for a, b in zip(gx.ravel(), gy.ravel())]
        snaps.append(dict(n=s["tests"], p=r2(p, 2)))
    if Cn.done(): break
D["contour"] = dict(tests=[dict(x=round(r["cand"]["x"], 3), y=round(r["cand"]["y"], 3), fail=r["fail"], sig=r["sig"],
                                explore=bool(r["explore"])) for r in Cn.rows],
                    rounds=rounds, snaps=snaps, grid=[48, 27], stopped=Cn.done(), report=Cn.stats())

open(OUT, "w").write("Object.assign(window.FL = window.FL || {}, " + json.dumps(D, separators=(",", ":")) + ");\n")
print(json.dumps({k: {kk: vv for kk, vv in v.items() if not isinstance(vv, list)} for k, v in D.items()}, indent=1))
