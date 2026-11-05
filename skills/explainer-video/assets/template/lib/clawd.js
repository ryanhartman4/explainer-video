// Claw'd, the AI on the chart (DESIGN.md "Claw'd"): the Claude Code terminal mascot built in 3D with Three.js.
// Load after assets/vendor/three.min.js, lib/three-extras.js and lib/fl.js.
//
// The geometry follows the terminal glyph, three lines of quadrant blocks:   ▐▛███▜▌
//                                                                            ▝▜█████▛▘
//                                                                              ▘▘ ▝▝
// One glyph unit is a quadrant's width; a quadrant is 1 wide and 2 tall. So the body is 12 x 8, the eye slits are
// 1 x 2, set 2 below the top and 2.5 in from each side, the arm stubs are 2 x 2 on the body's second quadrant row
// from the bottom, and four 1 x 2 legs hang under it. Depth is ours (5: a slab, as the glyph reads).
//
// The look is a pure function of a pose (K.POSE keys) and the time t (breathing, blinks, tremble), so a frame
// renders the same in any seek order. Move pose keys with K.feel / K.hop, or directly with a K.driver.
(function () {
  const K = window.K, T = window.THREE;
  const U = 0.1;                                  // world units per glyph unit
  const CLAY = 0xd97757, INK = 0x17110f;          // Claude's coral; the eyes

  K.POSE = {
    wx: 0, hop: 0, bounce: 0,                     // glyph units: step sideways, lift, extra squash from a hop
    yaw: 0, pitch: 0, lean: 0, squash: 0,         // radians, and squash (+ taller, - flatter; volume kept)
    armL: 0, armR: 0,                             // radians, + raises the arm
    eyeH: 1, eyeW: 1, eyeTilt: 0,                 // eye slit height and width (1 = the glyph), tilt (+ tops in: worried)
    gx: 0, gy: 0, look: 1, tx: 960, ty: 540,      // gaze: manual (gx, gy in -1..1) blended with a page point (tx, ty) by look
    shake: 0, op: 1, blink: 1,                    // tremble (glyph units), canvas opacity, blink weight (0 on key beats)
  };

  // Each emotion is a set of pose values; K.feel tweens from the last one to the next.
  // Eyes carry most of it (there is no mouth); posture backs it up at smaller size (DESIGN.md "Claw'd").
  K.EMOTIONS = {
    neutral:  { squash: 0,     lean: 0,     pitch: 0,     armL: 0,     armR: 0,     eyeH: 1,    eyeW: 1,    eyeTilt: 0,    shake: 0 },
    curious:  { squash: 0.04,  lean: 0.14,  pitch: 0.08,  armL: 0.25,  armR: 0,     eyeH: 1.12, eyeW: 1.05, eyeTilt: 0,    shake: 0 },
    uneasy:   { squash: -0.04, lean: -0.05, pitch: -0.04, armL: -0.3,  armR: -0.3,  eyeH: 0.8,  eyeW: 0.95, eyeTilt: 0.16, shake: 0 },
    tense:    { squash: -0.09, lean: 0,     pitch: -0.1,  armL: -0.55, armR: -0.55, eyeH: 0.75, eyeW: 0.8,  eyeTilt: 0.14, shake: 0.08 },
    alarmed:  { squash: 0.1,   lean: 0,     pitch: -0.14, armL: 0.95,  armR: 0.95,  eyeH: 1.4,  eyeW: 1.2,  eyeTilt: 0,    shake: 0 },
    glad:     { squash: 0.05,  lean: -0.06, pitch: 0.02,  armL: 0.6,   armR: 0.6,   eyeH: 0.32, eyeW: 1.15, eyeTilt: 0,    shake: 0 },
    attentive:{ squash: 0.02,  lean: 0,     pitch: 0.06,  armL: 0.05,  armR: 0.05,  eyeH: 1.05, eyeW: 1,    eyeTilt: 0,    shake: 0 },
  };
  // relief is a sequence (the author, 2026-11-04, after three candidates in spike/relief/): `lift` (rise, arms float, eyes
  // open), then `relieved` (the exhale: sink, arms loose, eyes shut, head back), then `calm` (eyes open and easy).
  // K.relief(tl, pose, at) plays all three.
  K.EMOTIONS.lift     = { squash: 0.05,  lean: 0.04, pitch: 0.03,  armL: 0.35,  armR: 0.35,  eyeH: 0.95, eyeW: 1.05, eyeTilt: 0, shake: 0 };
  K.EMOTIONS.relieved = { squash: -0.05, lean: 0,    pitch: -0.08, armL: -0.15, armR: -0.15, eyeH: 0.2,  eyeW: 1.12, eyeTilt: 0, shake: 0 };
  K.EMOTIONS.calm     = { squash: -0.02, lean: 0,    pitch: -0.04, armL: -0.05, armR: -0.05, eyeH: 0.85, eyeW: 1.05, eyeTilt: 0, shake: 0 };

  // parent: the element to draw in. o: { x, y, w, h (CSS px of the canvas), pr (render scale, default 2), fov (35),
  // seed (blink schedule), base (yaw at rest; negative faces screen-left), exposure, feet: [x, y] (page px where the
  // point under Claw'd's feet should land; overrides x, y) }
  K.clawd = (parent, o = {}) => {
    const W = o.w || 560, H = o.h || 560, PR = o.pr || 2;
    let X = o.x || 0, Y = o.y || 0;
    const canvas = K.el("canvas", { width: W * PR, height: H * PR,
      style: `position:absolute;left:${X}px;top:${Y}px;width:${W}px;height:${H}px;${o.style || ""}` }, parent);
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W * PR, H * PR, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = T.LinearToneMapping;                                       // ACES and AgX wash the coral toward peach
    renderer.toneMappingExposure = o.exposure ?? 0.9;
    renderer.outputColorSpace = T.SRGBColorSpace;

    const scene = new T.Scene();
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(renderer), 0.04).texture;   // soft studio reflections

    const camera = new T.PerspectiveCamera(o.fov || 35, W / H, 0.1, 50);
    camera.position.set(0, 1.25, 3.3);
    camera.lookAt(0, 0.52, 0);
    camera.updateMatrixWorld();
    if (o.feet) {                                                                    // stand on a page point
      const g = new T.Vector3(0, 0, 0).project(camera);
      X = o.feet[0] - ((g.x + 1) / 2) * W; Y = o.feet[1] - ((1 - g.y) / 2) * H;
      canvas.style.left = `${X}px`; canvas.style.top = `${Y}px`;
    }

    // light (meta-prompt cookbook): key : fill about 2 : 1 for a soft look, and a rim from behind so the coral
    // separates from the near-black canvas.
    const key = new T.DirectionalLight(0xfff1e6, 2.2); key.position.set(-3, 5, 4);
    const fill = new T.DirectionalLight(0xe6ecff, 1.1); fill.position.set(4, 1.5, 3);
    const rim = new T.DirectionalLight(0xffffff, 2.2); rim.position.set(1.5, 3, -5);
    scene.add(key, fill, rim);

    // non-metals: metalness 0, IOR 1.5 (4% reflectance). Satin vinyl body with a thin clearcoat; glossy eyes.
    const clay = new T.MeshPhysicalMaterial({ color: CLAY, roughness: 0.5, metalness: 0, ior: 1.5, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 0.45 });
    const ink = new T.MeshPhysicalMaterial({ color: INK, roughness: 0.18, metalness: 0, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
    const box = (w, h, d, r, m) => new T.Mesh(new T.RoundedBoxGeometry(w * U, h * U, d * U, 4, r * U), m);

    const root = new T.Group(); scene.add(root);
    [-4.5, -2.5, 2.5, 4.5].forEach(x => { const m = box(1, 2.3, 1.6, 0.3, clay); m.position.set(x * U, 1.15 * U, 0.6 * U); root.add(m); });
    const pivot = new T.Group(); pivot.position.y = 2 * U; root.add(pivot);          // the body squashes from its base
    const body = box(12, 8, 5, 0.9, clay); body.position.y = 4 * U; pivot.add(body);
    const face = new T.Group(); face.position.set(0, 5 * U, 2.5 * U); pivot.add(face);
    const eyes = [-3.5, 3.5].map(x => { const g = new T.Group(); g.position.x = x * U; g.add(box(1, 2, 0.6, 0.25, ink)); face.add(g); return g; });
    const arm = side => {
      const p = new T.Group(); p.position.set(side * 6 * U, 3 * U, 0);
      const m = box(2.4, 2, 2.2, 0.45, clay); m.position.x = side * 1.0 * U; p.add(m); pivot.add(p); return p;
    };
    const armL = arm(-1), armR = arm(1);

    // blinks: a seeded schedule, 4 frames shut and 6 open again (DESIGN.md: blinks stay under 1 per 2 s)
    const rnd = K.rng(o.seed || 7), blinks = [];
    for (let s = 1.4 + rnd() * 1.4; s < 900; s += 2.8 + rnd() * 2.4) blinks.push(s);
    const blink = t => {
      let lo = 0, hi = blinks.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; blinks[mid] <= t ? (lo = mid) : (hi = mid - 1); }
      const d = t - blinks[lo];
      if (d < 0) return 0;
      return d < 4 / 60 ? d / (4 / 60) : d < 10 / 60 ? 1 - (d - 4 / 60) / (6 / 60) : 0;
    };

    const v = new T.Vector3(), base = o.base ?? -0.18;
    // where Claw'd's face is on the page, for gaze
    const facePx = () => {
      face.getWorldPosition(v); v.project(camera);
      return [X + ((v.x + 1) / 2) * W, Y + ((1 - v.y) / 2) * H];
    };

    const pose = { ...K.POSE };
    function draw(p, t = 0) {
      // gaze: blend the manual gaze with the direction to the page point (tx, ty)
      const [hx, hy] = facePx();
      // full gaze at 900 px across or 600 px up: the chart's far rungs are farther than the old 420 px, which pinned it
      const gx = K.lerp(p.gx, K.clamp((p.tx - hx) / 900, -1, 1), p.look);
      const gy = K.lerp(p.gy, K.clamp(-(p.ty - hy) / 600, -1, 1), p.look);
      // the body turns after the eyes, about a quarter radian at full gaze (a secondary move); more hides the face
      root.rotation.y = base + p.yaw + 0.25 * gx;
      const breath = 0.012 * Math.sin((2 * Math.PI * t) / 3.4);                       // ambient: 1.2%, never stops
      const sy = Math.max(0.5, 1 + p.squash + p.bounce + breath), sxz = 1 / Math.sqrt(sy);
      pivot.scale.set(sxz, sy, sxz);
      pivot.rotation.set(p.pitch - 0.1 * gy, 0, p.lean);
      const jx = p.shake * (Math.sin(2 * Math.PI * 8.3 * t) + 0.5 * Math.sin(2 * Math.PI * 13.1 * t)) / 1.5;
      root.position.set((p.wx + jx) * U, p.hop * U, 0);
      const sway = 0.03 * Math.sin((2 * Math.PI * t) / 2.9);
      armL.rotation.z = -(p.armL + sway); armR.rotation.z = p.armR + sway;
      // gaze reach: 0.7 across and 0.5 up or down; more and an eye leaves the flat of the face
      face.position.x = gx * 0.7 * U;
      face.position.y = (5 + gy * 0.5) * U;
      const shut = 1 - 0.9 * blink(t) * p.blink;
      eyes[0].scale.set(p.eyeW, p.eyeH * shut, 1); eyes[1].scale.set(p.eyeW, p.eyeH * shut, 1);
      eyes[0].rotation.z = -p.eyeTilt; eyes[1].rotation.z = p.eyeTilt;
      canvas.style.opacity = p.op;
      renderer.render(scene, camera);
    }
    return { canvas, renderer, scene, camera, pose, draw, facePx };
  };

  // Tween a pose into an emotion at `at`, from the one before it (calls must come in time order per pose).
  // Posture may overshoot a little (position and size can spring); eyes and opacity never do.
  const last = new WeakMap();
  // start a pose in an emotion with no tween (frame 0 of a poster must already show it)
  K.feelInit = (pose, name) => { Object.assign(pose, K.EMOTIONS[name]); last.set(pose, { v: { ...K.EMOTIONS.neutral, ...K.EMOTIONS[name] }, tw: [] }); };
  K.feel = (tl, pose, name, at, dur = K.f(30), ease = "back.out(1.4)") => {
    const to = K.EMOTIONS[name];
    if (!to) { console.error(`K.feel: no emotion "${name}"`); return; }
    const prev = last.get(pose) || { v: { ...K.EMOTIONS.neutral }, tw: [] };
    for (const tw of prev.tw) if (tw.startTime() + tw.duration() > at) tw.duration(Math.max(K.f(1), at - tw.startTime()));
    const body = ["squash", "lean", "pitch", "armL", "armR"], face = ["eyeH", "eyeW", "eyeTilt", "shake"];
    const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k]]));
    const tw = [
      tl.fromTo(pose, pick(prev.v, body), { ...pick(to, body), duration: dur, ease, immediateRender: false }, at),
      tl.fromTo(pose, pick(prev.v, face), { ...pick(to, face), duration: dur * 0.8, ease: "power2.inOut", immediateRender: false }, at),
    ];
    last.set(pose, { v: { ...prev.v, ...to }, tw });
  };

  // a hop: crouch (anticipation), lift, stretch in the air, land with a squash that springs back
  // an exhale: the body sinks a little over 24 frames and rises back over 48 (relief settling, in place of a hop)
  K.sigh = (tl, pose, at, depth = 0.07) => {
    tl.fromTo(pose, { bounce: 0 }, { bounce: -depth, duration: K.f(24), ease: "sine.inOut", immediateRender: false }, at);
    tl.fromTo(pose, { bounce: -depth }, { bounce: 0, duration: K.f(48), ease: "sine.inOut", immediateRender: false }, at + K.f(24));
  };

  // relief: lift for 0.5 s (rising 0.6 units), exhale with the eyes shut, then open them again 1.7 s later.
  // Uses K.feel, so call it in time order with the pose's other emotions.
  K.relief = (tl, pose, at) => {
    const up = K.f(30), ex = at + K.f(32);
    K.feel(tl, pose, "lift", at, K.f(24));
    tl.fromTo(pose, { hop: 0 }, { hop: 0.6, duration: up, ease: "power2.out", immediateRender: false }, at);
    K.feel(tl, pose, "relieved", ex, K.f(36), "power2.inOut");
    tl.fromTo(pose, { hop: 0.6 }, { hop: 0, duration: K.f(36), ease: "power2.inOut", immediateRender: false }, ex);
    K.sigh(tl, pose, ex + K.f(6), 0.07);
    K.feel(tl, pose, "calm", ex + 1.7, K.f(24), "power2.inOut");
    tl.set(pose, { blink: 0 }, at - 0.1); tl.set(pose, { blink: 1 }, ex + 2.2);
  };

  K.hop = (tl, pose, at, h = 1.2, dur = K.f(30)) => {
    const c = K.f(6), up = dur * 0.45, down = dur * 0.55, land = K.f(14);
    tl.fromTo(pose, { bounce: 0 }, { bounce: -0.08, duration: c, ease: "power2.out", immediateRender: false }, at - c);
    tl.fromTo(pose, { bounce: -0.08 }, { bounce: 0.06, duration: up, ease: "power2.out", immediateRender: false }, at);
    tl.fromTo(pose, { hop: 0 }, { hop: h, duration: up, ease: "power2.out", immediateRender: false }, at);
    tl.fromTo(pose, { hop: h }, { hop: 0, duration: down, ease: "power2.in", immediateRender: false }, at + up);
    tl.fromTo(pose, { bounce: 0.06 }, { bounce: -0.1, duration: down, ease: "power2.in", immediateRender: false }, at + up);
    tl.fromTo(pose, { bounce: -0.1 }, { bounce: 0, duration: land, ease: "back.out(2)", immediateRender: false }, at + dur);
  };
})();
