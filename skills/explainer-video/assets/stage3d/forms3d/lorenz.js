// forms3d/lorenz.js: the points stream along one long solution of the Lorenz equations (or of any 3D flow you give).
//   G3.form("mine", G3.lib.lorenz({ sigma: 10, rho: 28, beta: 8 / 3, speed: 0.55 }));  G3.morph(t, "mine")
//   const L = G3.lib.lorenz({ fall: 2.5 });  G3.form("mine", L);  const a = L.path(1, 1, 1);  a(3.2) -> [x, y, z]
// Everything is integrated here with fourth-order Runge-Kutta (RK4). Nothing is drawn from a stored picture.
//
// Options (all optional):
//   sigma (10), rho (28), beta (8/3): the constants of dx/dt = sigma(y - x), dy/dt = x(rho - z) - y, dz/dt = xy - beta z.
//   flow (none): (x, y, z) => [dx, dy, dz]. Any 3D flow in place of the Lorenz equations. sigma, rho and beta are
//          then unused. A slow flow wants a larger dt, length, settle and speed. The Rossler system, for example:
//          { flow: (x, y, z) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)], dt: 0.05, length: 600, settle: 100, speed: 4 }
//   speed (0.55): simulated time units that pass in one second of local time once the points are streaming.
//   fall (0): seconds. Above 0 the form opens as a loose cloud of starting states. Each one is stepped through the
//          equations and the cloud falls onto the attractor in that many seconds. Then the points stream as usual.
//   fallSpan (1.7): the simulated time the fall covers. Lorenz pulls a cloud flat in under two time units. A flow that
//          contracts slowly needs more. Points still far from the long solution at the end jump to it in the hand-over.
//   cloud (9): radius of the starting cloud, in world units.
//   color (none): a look token for all the points ("blue", "accent", ...). Default: the film's own dress.
//   scale (fitted): world units per unit of the equations. center (fitted): the state [x, y, z] placed at the origin.
//   box ([30, 16, 18]): the width, height and depth the fit may use, in world units.
//   turn (0): radians the solution is turned about its vertical axis before it is drawn.
//   start ([1, 1, 1]): where the long solution starts. settle (15): simulated time run first and thrown away, so the
//          solution is on the attractor. length (100): simulated time the long solution covers (about 130 turns of
//          Lorenz). dt (0.01): the RK4 step, and the spacing of the stored samples.
//
// Local time (tl, seconds since the morph unless you give G3.morph a clock):
//   fall off: the points stream from tl = 0, each from its own place on the solution. Below 0 they hold still.
//   fall on:  below 0 the cloud waits, drifting a little, its points drawn larger. From 0 to `fall` it is stepped
//             through the equations and lands on the attractor. Over the next 0.55 s each point is handed to the
//             nearest place on the long solution, and the stream runs on, easing to `speed`. build.landed =
//             fall + 0.55 is when the hand-over is done.
//   To start the fall on a spoken word: G3.morph(t0, "mine", { clock: t => t - p.at("step them forward") })
//
// For labels and markers (form coordinates at scale 1, before the morph's at and scale: pass them through
//   seg.world(p, t), where seg is what G3.morph returned):
//   build.path(x0, y0, z0, { span: 30, skip: 0, dt }) -> at. The solution that starts at the state (x0, y0, z0),
//          integrated for `span` time units in steps of dt (default: half the form's dt, so 0.005). `skip` time
//          units are run first and thrown away: use it to start a marker on the attractor.
//          at(s) -> [x, y, z], where the solution is at simulated time s (0 to span), in form coordinates.
//          at.state(s) -> the same in the units of the equations. For Lorenz the sign of its x tells the wing.
//          A film draws its own marker and trail from at(s), with any clock s(t) it likes. A path can swing a
//          little outside the fitted box: the long solution does not reach the attractor's farthest edge.
//   build.gap(a, b) -> s => the distance between two paths at simulated time s, in the units of the equations.
//          Two markers that start 0.000001 apart: a = build.path(x, y, z), b = build.path(x + 1e-6, y, z).
//   build.toForm(x, y, z) -> [x, y, z]: any state of the equations in form coordinates.
//   build.wings: the two fixed points at the middle of the wings, [left, right], in form coordinates. Lorenz only
//          (null with a flow of your own, or when rho is 1 or less).
//   build.scale, build.center: the fit that was used. build.size: [w, h, d] of the solution in world units.
//   build.speed, build.fall, build.landed: the options, and the local time at which the stream has taken over.
//
// Size: the long solution is fitted inside a box 30 x 16 x 18 world units (option box), centred on the origin, facing
//   the rest camera (az 0, el 0, dist 34). State x runs across the screen, z up, y toward the camera. Lorenz at the
//   default constants comes out about 13 wide, 15 high and 18 deep: the two wings side by side.
//   What the fit assumes: the solution stays bounded, and after `settle` time units it is on its attractor and visits
//   all of it within `length`. The box is measured on that one solution. A flow that runs off to infinity or dies at
//   a fixed point gives a bad fit: pass scale and center yourself. For Lorenz the centre is put on the axis of
//   symmetry (x = y = 0). For a flow of your own it is the middle of the solution's bounding box.
// Cost: G3.lib.lorenz() integrates the long solution at once (about 5 ms), so the anchors are ready before the form
//   is drawn. With fall on, build also steps every point through the fall: about 100 ms at 30,000 points.
// Source: E. N. Lorenz, "Deterministic Nonperiodic Flow", J. Atmos. Sci. 20 (1963). Extracted from scene 4 of the
//   film "One Sitting".
(function () {
  const G3 = window.G3;
  G3.lib.lorenz = (o = {}) => {
    const hash = G3.hash, clamp = G3.clamp;
    const sigma = o.sigma ?? 10, rho = o.rho ?? 28, beta = o.beta ?? 8 / 3, flow = typeof o.flow === "function" ? o.flow : null;
    const speed = o.speed ?? 0.55, fall = Math.max(0, +o.fall || 0), fallSpan = o.fallSpan ?? 1.7, cloudR = o.cloud ?? 9;
    const dt = o.dt ?? 0.01, settle = o.settle ?? 15, length = o.length ?? 100, start = o.start || [1, 1, 1], turn = o.turn || 0, box = o.box || [30, 16, 18];
    const HAND = 0.55, EASE = 1.5;                 // seconds: the hand-over from the fall to the stream, and the time the stream takes to reach `speed` after it

    // ---- one RK4 step in place. The Lorenz step is written out; a flow of your own goes through the general one.
    const step = flow ? (s, h) => {
      const x = s[0], y = s[1], z = s[2], k1 = flow(x, y, z), k2 = flow(x + 0.5 * h * k1[0], y + 0.5 * h * k1[1], z + 0.5 * h * k1[2]),
        k3 = flow(x + 0.5 * h * k2[0], y + 0.5 * h * k2[1], z + 0.5 * h * k2[2]), k4 = flow(x + h * k3[0], y + h * k3[1], z + h * k3[2]);
      s[0] = x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); s[1] = y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); s[2] = z + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    } : (s, h) => {
      const x = s[0], y = s[1], z = s[2];
      const k1x = sigma * (y - x), k1y = x * (rho - z) - y, k1z = x * y - beta * z;
      let a = x + 0.5 * h * k1x, b = y + 0.5 * h * k1y, c = z + 0.5 * h * k1z;
      const k2x = sigma * (b - a), k2y = a * (rho - c) - b, k2z = a * b - beta * c;
      a = x + 0.5 * h * k2x; b = y + 0.5 * h * k2y; c = z + 0.5 * h * k2z;
      const k3x = sigma * (b - a), k3y = a * (rho - c) - b, k3z = a * b - beta * c;
      a = x + h * k3x; b = y + h * k3y; c = z + h * k3z;
      const k4x = sigma * (b - a), k4y = a * (rho - c) - b, k4z = a * b - beta * c;
      s[0] = x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); s[1] = y + h / 6 * (k1y + 2 * k2y + 2 * k3y + k4y); s[2] = z + h / 6 * (k1z + 2 * k2z + 2 * k3z + k4z);
    };

    // ---- the long solution, and the fit: state -> form coordinates (state z is up, the view is turned about it)
    const M = Math.max(400, Math.round(length / dt)), RAW = new Float64Array(M * 3), cT = Math.cos(turn), sT = Math.sin(turn);
    { const s = [start[0], start[1], start[2]]; for (let i = Math.round(settle / dt); i > 0; i--) step(s, dt); for (let i = 0; i < M; i++) { step(s, dt); RAW.set(s, i * 3); } }
    const lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30];          // the solution's bounding box in the turned frame (across, up, toward the camera)
    for (let i = 0; i < M * 3; i += 3) { const q = [RAW[i] * cT + RAW[i + 1] * sT, RAW[i + 2], RAW[i + 1] * cT - RAW[i] * sT]; for (let k = 0; k < 3; k++) { if (q[k] < lo[k]) lo[k] = q[k]; if (q[k] > hi[k]) hi[k] = q[k]; } }
    if (!flow) for (const k of [0, 2]) { const m = Math.max(-lo[k], hi[k]); lo[k] = -m; hi[k] = m; }   // Lorenz is unchanged by (x, y) -> (-x, -y)
    const mid = lo.map((v, k) => (v + hi[k]) / 2), ext = lo.map((v, k) => Math.max(1e-9, hi[k] - v));
    const center = o.center || [mid[0] * cT - mid[2] * sT, mid[0] * sT + mid[2] * cT, mid[1]];
    const fitK = Math.min(box[0] / ext[0], box[1] / ext[1], box[2] / ext[2]), K = o.scale ?? (isFinite(fitK) ? fitK : 1);
    const toForm = (x, y, z) => { x -= center[0]; y -= center[1]; return [(x * cT + y * sT) * K, (z - center[2]) * K, (y * cT - x * sT) * K]; };
    const TR = new Float32Array(M * 3);
    for (let i = 0; i < M * 3; i += 3) TR.set(toForm(RAW[i], RAW[i + 1], RAW[i + 2]), i);
    const L = M - 2, SEAM = Math.round(M * 0.04), PERIOD = 115;         // PERIOD: samples between the bright heads that ride the flow

    // ---- the cloud (only with fall): starting states in a loose ball, each stepped forward through the fall and the
    // hand-over, stored every few steps. Then each point is given the nearest sample of the long solution at the end
    // of the fall, so the stream carries on from where the fall left it.
    const r0 = fall > 0 ? fallSpan / fall : 0, extra = Math.min(r0 * HAND, 1.5) + 0.05, FDT = 2 * dt, per = Math.max(2, Math.ceil((fallSpan + extra) / FDT / 110)), SNAP = per * FDT;
    const simulate = N => {
      const FAR = 6 * (box[0] + box[1] + box[2]), N3 = N * 3, NS = Math.round((fallSpan + extra) / SNAP) + 2, SN = new Float32Array(NS * N * 3), q = [0, 0, 0], kF = fallSpan / SNAP;
      for (let i = 0; i < N; i++) {
        const u = hash(i, 401) * 2 - 1, an = hash(i, 402) * 6.2832, r = cloudR / K * Math.pow(hash(i, 403), 0.7), w = Math.sqrt(1 - u * u);
        const a = r * w * Math.cos(an) * 1.15, c = r * w * Math.sin(an) * 1.15;                         // across and toward the camera, in the turned frame
        q[0] = center[0] + a * cT - c * sT; q[1] = center[1] + a * sT + c * cT; q[2] = center[2] + r * u * 0.9;
        for (let k = 0, lost = false; k < NS; k++) {
          if (k && !lost) for (let j = 0; j < per; j++) step(q, FDT);
          const x = q[0] - center[0], y = q[1] - center[1], fx = (x * cT + y * sT) * K, fy = (q[2] - center[2]) * K, fz = (y * cT - x * sT) * K, at = (k * N + i) * 3;
          if (k && !(Math.abs(fx) + Math.abs(fy) + Math.abs(fz) < FAR)) lost = true;                 // it left for infinity (a flow with a finite basin): it stays where it last was
          if (lost) { SN[at] = SN[at - N3]; SN[at + 1] = SN[at - N3 + 1]; SN[at + 2] = SN[at - N3 + 2]; } else { SN[at] = fx; SN[at + 1] = fy; SN[at + 2] = fz; }
        }
      }
      const U = Math.max(ext[0], ext[1], ext[2]) * K / 18, CELL = 0.4 * U, G = 64, NEAR = 0.2 * U, CAP = Math.max(2, Math.round(8 * N / 30000)), cell = v => Math.floor(v / CELL) + 32;
      const head = new Int32Array(G * G * G).fill(-1), next = new Int32Array(M), used = new Uint8Array(M), J = new Float32Array(N);
      for (let i = 0; i < M - SEAM; i++) { const k = clamp(cell(TR[i * 3]), 0, G - 1) + G * (clamp(cell(TR[i * 3 + 1]), 0, G - 1) + G * clamp(cell(TR[i * 3 + 2]), 0, G - 1)); next[i] = head[k]; head[k] = i; }
      const k0 = Math.floor(kF), ku = kF - k0;
      for (let i = 0; i < N; i++) {
        const A = (k0 * N + i) * 3, B = A + N * 3, x = SN[A] + (SN[B] - SN[A]) * ku, y = SN[A + 1] + (SN[B + 1] - SN[A + 1]) * ku, z = SN[A + 2] + (SN[B + 2] - SN[A + 2]) * ku;
        const cx = cell(x), cy = cell(y), cz = cell(z); let best = -1, bd = 1e30;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
          const X = cx + a, Y = cy + b, Z = cz + c; if (X < 0 || Y < 0 || Z < 0 || X >= G || Y >= G || Z >= G) continue;
          for (let j = head[X + G * (Y + G * Z)]; j >= 0; j = next[j]) { const dx = TR[j * 3] - x, dy = TR[j * 3 + 1] - y, dz = TR[j * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd && used[j] < CAP) { bd = d; best = j; } }
        }
        if (best < 0 || bd > NEAR * NEAR) best = Math.floor(hash(i, 404) * (M - SEAM));            // still off the solution (inside a wing's eye): it joins the stream anywhere
        used[best]++; J[i] = best + hash(i, 405) * 0.98;
      }
      return { SN, NS, J };
    };

    const build = (f, N) => {
      const kN = clamp(Math.sqrt(30000 / N), 0.7, 1.5), P = f.pos, S = f.size;                     // fewer points are drawn larger, more points smaller: the same light
      if (o.color) for (let i = 0; i < N; i++) G3.tint(f, i, o.color, 0.5 + 0.5 * hash(i, 4));
      const sim = fall > 0 ? simulate(N) : null, J = sim ? sim.J : new Float32Array(N), sStream = new Float32Array(N), sCloud = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        if (!sim) J[i] = hash(i, 404) * (M - SEAM);
        const ph = (J[i] / PERIOD) % 1;
        sStream[i] = (0.42 + 1.15 * Math.exp(-(1 - ph) * 6.5) + (hash(i, 407) > 0.985 ? 0.9 : 0)) * kN;   // streaks of light that ride the flow
        sCloud[i] = (0.5 + 0.6 * hash(i, 406) + (hash(i, 407) > 0.972 ? 1.5 : 0)) * kN;
      }
      const stream = (i, j, adv) => {                                                             // point i, adv samples along the long solution from its own place
        let q = J[i] + adv; q -= Math.floor(q / L) * L; const a = Math.floor(q), u = q - a, k = a * 3;
        P[j] = TR[k] + (TR[k + 3] - TR[k]) * u; P[j + 1] = TR[k + 1] + (TR[k + 4] - TR[k + 1]) * u; P[j + 2] = TR[k + 2] + (TR[k + 5] - TR[k + 2]) * u;
      };
      if (!sim) { S.set(sStream); return tl => { const adv = Math.max(0, tl) * speed / dt; for (let i = 0, j = 0; i < N; i++, j += 3) stream(i, j, adv); }; }
      const { SN, NS } = sim, g = u => u * u * u - u * u * u * u / 2;                              // g: the integral of a smooth step
      return tl => {
        const tau = tl - fall;                                                                    // seconds since the end of the fall
        if (tau >= HAND) {                                                                        // streaming: the pace eases from the fall's to `speed`
          const v = tau - HAND, adv = (r0 * tau + (speed - r0) * (EASE * g(clamp(v / EASE)) + Math.max(0, v - EASE))) / dt;
          S.set(sStream); for (let i = 0, j = 0; i < N; i++, j += 3) stream(i, j, adv);
          return;
        }
        const s = Math.max(0, tl) * r0, k = clamp(s / SNAP, 0, NS - 1.0001), ka = Math.floor(k), u = k - ka, A = ka * N * 3, B = A + N * 3;
        const wob = 0.9 * (tl < 0 ? 1 : Math.max(0, 1 - s / 0.3)), tw = Math.min(tl, 0), e = tau > 0 ? G3.ease(tau / HAND) : 0, adv = Math.max(0, tau) * r0 / dt;
        const big = 1 + 0.6 * (1 - G3.ease(clamp(tl / 1.5)));                                     // the waiting cloud is drawn larger; it sharpens as the stepping starts
        for (let i = 0, j = 0; i < N; i++, j += 3) {
          if (e > 0) stream(i, j, adv);
          let x = SN[A + j] + (SN[B + j] - SN[A + j]) * u, y = SN[A + j + 1] + (SN[B + j + 1] - SN[A + j + 1]) * u, z = SN[A + j + 2] + (SN[B + j + 2] - SN[A + j + 2]) * u;
          if (wob > 0) { const ph = hash(i, 408) * 6.2832; x += wob * Math.sin(tw * 1.1 + ph); y += wob * Math.cos(tw * 0.9 + ph * 1.7); z += wob * Math.sin(tw * 0.7 + ph * 2.3); }
          if (e > 0) { P[j] = x + (P[j] - x) * e; P[j + 1] = y + (P[j + 1] - y) * e; P[j + 2] = z + (P[j + 2] - z) * e; S[i] = sCloud[i] * big + (sStream[i] - sCloud[i] * big) * e; }
          else { P[j] = x; P[j + 1] = y; P[j + 2] = z; S[i] = sCloud[i] * big; }
        }
      };
    };

    // ---- for the film's own markers and labels
    build.path = (x0, y0, z0, po = {}) => {
      const h = po.dt ?? dt / 2, span = po.span ?? 30, n = Math.max(2, Math.round(span / h) + 1), D = new Float64Array(n * 3), s = [x0, y0, z0];
      for (let i = Math.round((po.skip || 0) / h); i > 0; i--) step(s, h);
      for (let i = 0; i < n; i++) { if (i) step(s, h); D.set(s, i * 3); }
      const state = t => { const q = clamp(t / h, 0, n - 1.001), i = Math.floor(q), u = q - i, a = i * 3; return [D[a] + (D[a + 3] - D[a]) * u, D[a + 1] + (D[a + 4] - D[a + 1]) * u, D[a + 2] + (D[a + 5] - D[a + 2]) * u]; };
      const at = t => { const p = state(t); return toForm(p[0], p[1], p[2]); };
      at.state = state; at.span = span;
      return at;
    };
    build.gap = (a, b) => t => { const p = a.state(t), q = b.state(t); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
    build.toForm = toForm; build.scale = K; build.center = center; build.size = ext.map(v => v * K);
    const wing = !flow && rho > 1 && beta > 0 ? Math.sqrt(beta * (rho - 1)) : 0;
    build.wings = wing ? [toForm(-wing, -wing, rho - 1), toForm(wing, wing, rho - 1)].sort((a, b) => a[0] - b[0]) : null;
    build.speed = speed; build.fall = fall; build.landed = fall > 0 ? fall + HAND : 0;
    return build;
  };
})();
