"""make_data.py WEIGHTS OUT.js : the numbers and point clouds the scenes draw, computed with re-implemented FLT4 formulas
(3INST hash, hfold rotation, tcq Viterbi) on one real weight matrix (LFM2.5-1.2B-Instruct, model.layers.6.conv.out_proj.weight, raw bf16 2048x2048).

Run: uv run --python 3.12 --with numpy python -I tools/make_data.py <tensor.bf16> video/data/data.js"""
import sys, json, math
import numpy as np

WEIGHTS, OUT = sys.argv[1:3]
rng = np.random.default_rng(7)

r2 = lambda a, d=3: [round(float(x), d) for x in np.asarray(a).ravel()]
D = {}

# ---------------------------------------------------------------- scene 5: the 3INST hash codebook (flt_encode.py)
MU, ISIG = 0.00010134279727935791, 0.805455414990326
def raw3(sd=0, L=14):
    s = np.arange(1 << L, dtype=np.uint64); b = (64248484 + sd * 0x9E3779B9) & 0xFFFFFFFF
    v = ((89226354 * s + b) & 0xFFFFFFFF).astype(np.uint32); m = (v & np.uint32(0x8FFF8FFF)) ^ np.uint32(0x3B603B60)
    return m.view(np.float16).reshape(-1, 2).astype(np.float32).sum(1)
RAW = raw3(); C0 = ((RAW - MU) * ISIG).astype(np.float32)
edges = np.linspace(-3.5, 3.5, 57); cnt, _ = np.histogram(C0, edges)
ndots = 1400; pick = np.arange(ndots)          # states 0..1399, in order, as the window would visit them
bins = np.clip(np.digitize(C0[pick], edges) - 1, 0, len(edges) - 2); stack = np.zeros(len(edges) - 1, int); hgt = []
for b in bins: hgt.append(int(stack[b])); stack[b] += 1
def hash_steps(s0, nibs):
    out, s = [], s0
    for n in nibs:
        s = ((s << 4) | n) & 0x3FFF; out.append(dict(nib=n, state=s, bits=format(s, "014b"), value=round(float(C0[s]), 3)))
    return out
D["hash"] = dict(edges=r2(edges, 3), counts=cnt.tolist(), dots=dict(bin=bins.tolist(), h=hgt, v=r2(C0[pick], 3)),
                 mean=round(float(C0.mean()), 4), std=round(float(C0.std()), 4), n=len(C0),
                 steps=hash_steps(0b10110010011101, [0b1011, 0b0110, 0b1110, 0b0011]))

# ---------------------------------------------------------------- the real weight matrix, before and after the fold
Wb = np.fromfile(WEIGHTS, dtype=np.uint16).astype(np.uint32) << 16
Wt = Wb.view(np.float32).reshape(2048, 2048)
def hadamard(n):
    r = np.arange(n)[:, None] & np.arange(n)[None, :]; par = np.zeros_like(r)
    for b in range(int(np.log2(n)) + 1): par ^= (r >> b) & 1
    return (np.where(par & 1, -1.0, 1.0) / np.sqrt(n)).astype(np.float32)
Hm = hadamard(256)
Ds = np.where(np.random.default_rng([0, 2048, 4242]).random(2048) < 0.5, -1, 1).astype(np.float32)   # hfold seed 0
Wf = ((Wt * Ds[None, :]).reshape(2048, 8, 256) @ Hm).reshape(2048, 2048)
# check the fold is a pure re-parameterization: W x == W_f (H D x)
x = np.random.default_rng(1).standard_normal(2048).astype(np.float32)
assert np.allclose(Wt @ x, Wf @ ((Ds * x).reshape(8, 256) @ Hm.T).ravel(), atol=1e-3)
def blocks(M): Z = M.reshape(-1, 256).astype(np.float64); return Z / np.sqrt((Z ** 2).mean(1, keepdims=True))
Zb, Za = blocks(Wt), blocks(Wf)
kurt = lambda Z: float(((Z ** 4).mean()))       # Gaussian = 3
he = np.linspace(-9, 9, 73)
worst = int(np.abs(Zb).max(1).argmax())
D["rotate"] = dict(edges=r2(he, 2), before=np.histogram(Zb, he)[0].tolist(), after=np.histogram(Za, he)[0].tolist(),
                   kurt_before=round(kurt(Zb), 2), kurt_after=round(kurt(Za), 2),
                   max_before=round(float(np.abs(Zb).max()), 1), max_after=round(float(np.abs(Za).max()), 1),
                   tail_before=float(f"{(np.abs(Zb) > 4).mean():.2e}"), tail_after=float(f"{(np.abs(Za) > 4).mean():.2e}"),
                   block=worst, block_before=r2(Zb[worst], 3), block_after=r2(Za[worst], 3),
                   hadamard16=(hadamard(16) > 0).astype(int).ravel().tolist(), signs16=Ds[:16].astype(int).tolist(),
                   tensor="LFM2.5-1.2B-Instruct  layers.6.conv.out_proj  (2048 x 2048)")

# ---------------------------------------------------------------- scene 3: one real 32-weight group, unrotated
G = Wt.reshape(-1, 32).astype(np.float64); gr = np.abs(G).max(1) / np.sqrt((G ** 2).mean(1))
gi = int(np.argsort(gr)[-40])                   # a group with one clear outlier (not the single most extreme)
g = G[gi]; lo, hi = g.min(), g.max(); lv = lo + (hi - lo) * np.arange(16) / 15
q = np.rint((g - lo) / (hi - lo) * 15).astype(int)
D["q4"] = dict(values=r2(g, 5), levels=r2(lv, 5), q=q.tolist(), outlier=int(np.abs(g).argmax()),
               used=int(len(set(q.tolist()))), rms=round(float(np.sqrt((g ** 2).mean())), 5))

# ---------------------------------------------------------------- scenes 5-6: real FLT4 encode of real folded blocks
def viterbi(X, Cb, k=4, L=14):
    """tcq.encode_rows: X (rows, n) ~N(0,1) -> reconstruction (rows, n) along the best bitshift-trellis path"""
    rows, n = X.shape; S = 1 << L; P = S >> k
    cost = np.zeros((rows, S), np.float32); back = np.empty((n, rows, P), np.uint8)
    for t in range(n):
        m = cost.reshape(rows, 1 << k, P); am = m.argmin(1); mn = np.take_along_axis(m, am[:, None, :], 1)[:, 0, :]
        back[t] = am; cost = np.repeat(mn, 1 << k, axis=1) + (X[:, t:t + 1] - Cb[None, :]) ** 2
    s = cost.argmin(1); states = np.empty((rows, n), np.int64); r = np.arange(rows)
    for t in range(n - 1, -1, -1):
        states[:, t] = s; p = s >> k; s = back[t][r, p].astype(np.int64) * P + p
    return Cb[states], states
nb = 96; idx = np.sort(rng.choice(len(Za), nb, replace=False)); X = Za[idx].astype(np.float32)
errs = []
for sd in range(4):
    raw = raw3(sd); sig = float((raw - MU).std()); Cs = ((raw - MU) / sig).astype(np.float32)
    Y, states = viterbi(X, Cs)
    gain = (X * Y).sum(1, keepdims=True) / (Y * Y).sum(1, keepdims=True)
    errs.append(((X - gain * Y) ** 2).sum(1) / (X ** 2).sum(1))
    if sd == 0: Y0, S0, g0 = Y, states, gain
errs = np.array(errs); best = errs.min(0)
D["flt4"] = dict(true=r2(X[0, :64], 3), decoded=r2((g0 * Y0)[0, :64], 3), states=S0[0, :64].tolist(),
                 nmse_seed0=round(float(errs[0].mean()), 5), nmse_best4=round(float(best.mean()), 5),
                 seed_err=[r2(errs[:, i], 5) for i in range(8)], seed_best=errs[:, :8].argmin(0).tolist(), blocks=nb)

# ---------------------------------------------------------------- scene 5: a toy trellis small enough to draw
Lt = 4; Ct = np.sort(rng.standard_normal(1 << Lt)).astype(np.float32); Ct = Ct[np.random.default_rng(3).permutation(16)]
xt = X[0, :12] / 1.0
Yt, St = viterbi(xt[None, :].astype(np.float32), Ct, k=2, L=Lt)
D["trellis"] = dict(L=Lt, k=2, codebook=r2(Ct, 3), true=r2(xt, 3), path=St[0].tolist(), decoded=r2(Yt[0], 3))

# ---------------------------------------------------------------- scenes 3 and 6: error vs rate for a Gaussian source
R = np.linspace(1, 5, 41)
D["rd"] = dict(R=r2(R, 2), limit=r2(2.0 ** (-2 * R), 6),
               lloyd_max={"1": 0.3634, "2": 0.1175, "3": 0.03454, "4": 0.009497, "5": 0.002499},
               flt4_roadmap=0.00462, flt4_here=D["flt4"]["nmse_best4"])

open(OUT, "w").write("Object.assign(window.FL = window.FL || {}, " + json.dumps(D, separators=(",", ":")) + ");\n")
print(json.dumps({k: (v if not isinstance(v, dict) else {kk: vv for kk, vv in v.items() if not isinstance(vv, list)})
                  for k, v in D.items()}, indent=1))
