// play.js: what happens on the field at each spoken phrase, for both cuts. SCRIPT.md has the beat sheet; each beat
// there is one block here. The field (field.js) is drawn in yards, so the same moves serve both frames; each film
// file brings its own spots, its own camera presets and its own type (the hud object), composed for its frame.
//
//   Play(film, F, hud, o)
//   camera presets the film must define: top (the playbook view), rule (top, closer to the line), tv (the broadcast angle),
//   tvBox (the broadcast angle, closer on the backfield)
//   hud: { title, heading(words, t, id), showDigit("rb" | "te", t), digits(stateKey, t), pulseDigits(t), name(stateKey, t),
//          nameOff(t), line(t), lineOff(t), usage(t), bar(i, t), barsOff(t), note(words, t, until) }
//   o: { count: { L: [x, z], R: [x, z], px }, depthX, depthOff, sevenAt, routeTop, routeScale, rel, defZ, defGap }: where this
//   frame wants the side counts, the depth mark and the routes, in yards
window.Play = function (film, F, hud, o = {}) {
  const [p1, p2, p3, p4, p5, p6, p7] = film.paras, D = window.SHARED;
  D.problems().forEach(m => film.problem("formation data: " + m));               // eleven men, seven on the line, in every picture
  const eleven = ["X", "J", "lt", "lg", "QB", "c", "B", "rg", "rt", "Y", "Z"];   // left to right

  // ---- 1. what never changes. The film opens on the broadcast angle (the poster), then rises to the playbook view.
  F.cam.go("top", p1.start + 0.5, { dur: 2.6 });
  F.pulse(eleven, Math.max(p1.at("eleven players"), p1.start + 2.5), 0.07);
  const tL = p1.at("Five interior linemen"), tQ = p1.at("One quarterback"), tF = p1.at("That leaves five");
  hud.title.hide(tL - 0.3); hud.heading("Eleven players", tL, "head-eleven");
  F.light(tL, ["line"]).linemen(tL);
  F.light(tQ, ["QB"]).pulse("QB", tQ).ring("QB", tQ + 0.05, tF - 0.2);
  F.light(tF, ["five"]);
  F.paint(["B"], p1.at("the backs")).paint(["Y"], p1.at("tight ends")).paint(["X", "J", "Z"], p1.at("receivers the offense"));

  // ---- 2. the one rule
  const t2 = p2.at("One rule"), t3 = p3.at("who are those five");
  hud.heading("The rule", t2, "head-rule");
  F.light(t2, ["line", "QB", "five"]).los(t2).cam.go("rule", t2, { dur: 1.6 });
  const t7 = p2.at("seven men");
  hud.line(t7); F.seven(t7 + 0.1, t3 - 0.25, { count: true }); film.hit("thock", t7 + 0.1);
  const tEnds = p2.at("the two on its ends"), tYard = p2.at("a yard back");
  F.light(tEnds, ["X", "Y"]).ring("X", tEnds + 0.1, tYard - 0.2).ring("Y", tEnds + 0.35, tYard - 0.2);
  F.light(tYard, ["line", "QB", "five"]);
  F.measure("J", tYard, t3 - 0.25, "a yard off", { edge: true, off: [0.55, 0], align: "left" }).pulse("J", tYard);     // the gap between the line and a receiver who is off it
  F.measure("Z", tYard + 0.25, t3 - 0.25, "a yard off", { edge: true, off: [-0.55, 0], align: "right" }).pulse("Z", tYard + 0.25);

  // ---- 3. who: the personnel
  hud.heading("Who: the personnel", t3, "head-who"); hud.lineOff(t3 - 0.25);
  F.light(t3, ["five"]).cam.go("top", t3, { dur: 1.6 });
  const tRB = p3.at("count running backs"), tTE = p3.at("then tight ends"), t11p = p3.at("eleven personnel");
  hud.showDigit("rb", tRB); F.pulse("B", tRB + 0.1).ring("B", tRB, tTE - 0.15); film.hit("tick", tRB, { pitch: 2 });
  hud.showDigit("te", tTE); F.pulse("Y", tTE + 0.1).ring("Y", tTE, t11p - 0.15); film.hit("tick", tTE, { pitch: 4 });
  hud.pulseDigits(t11p);
  F.pulse(["X", "J", "Z"], p3.at("three receivers"), 0.12);
  hud.usage(p3.at("fifty-eight percent", -0.2));
  const bar = (i, t) => { hud.bar(i, t); film.hit("pluck", t + 0.7, { pitch: 4 - i * 2 }); };
  bar(0, p3.at("fifty-eight percent"));
  const t12 = p3.at("A second tight end"); F.go("twelve", t12); hud.digits("twelve", t12 + 0.3);
  bar(1, p3.at("twenty-four percent"));
  const t21 = p3.at("a second back"); F.go("twentyOne", t21); hud.digits("twentyOne", t21 + 0.3);
  bar(2, p3.at("seven percent"));

  // ---- 4. where the quarterback stands: seen from the stands, depth behind the line runs right to left
  const t4 = p4.at("where they stand"), t5 = p5.at("Next, the backs");
  hud.barsOff(t4 - 0.25); hud.heading("Where: the quarterback", t4, "head-qb");
  F.go("under", t4); hud.digits("under", t4 + 0.3);                              // the fullback goes back to the slot: eleven personnel again
  F.light(t4 + 0.2, ["QB", "line", "B"]).cam.go("tv", t4 + 0.15, { dur: 2.2 });
  const tU = p4.at("Under center"), tRun = p4.at("can run"), tG = p4.at("In shotgun"), tD = p4.at("five yards back"), tP = p4.at("The pistol");
  hud.name("under", Math.max(tU, t4 + 1.2)); F.pulse("QB", tU + 0.1);
  for (const k of [-1, 1]) F.arrow([k * 1.1, F.xz("deep")[1] + 0.4], [k * 6.4, -1.5], tRun + (k > 0 ? 0.2 : 0), tG - 0.3, { bend: -0.2 * k, color: "RB" });
  F.go("gun", tG, { stagger: { B: 0.15 } }).cam.go("tvBox", tG - 0.5, { dur: 3 }); hud.name("gun", tG + 0.3); film.hit("thock", tG + 0.5);
  F.measure("QB", tD, t5 - 0.25, [[tD, `about ${D.DEPTH.shotgun} yards`], [tP + 0.35, `about ${D.DEPTH.pistol} yards`]], { x: o.depthX ?? 7, off: o.depthOff || [1.25, 0], ext: true });
  F.pulse("B", p4.at("the runner beside him"));
  F.go("pistolQB", tP); hud.name("pistol", tP + 0.3);
  F.go("pistol", p4.at("the runner behind him"));

  // ---- 5. where the backs go
  hud.heading("Where: the backs", t5, "head-backs"); hud.nameOff(t5 - 0.25);
  F.go("under", t5).light(t5 + 0.2, ["QB", "five"]);
  const tFB = p5.at("a fullback in front"), tI = p5.at("the I formation"), t11 = p5.at("a third receiver");
  F.go("iForm", tFB); hud.digits("iForm", tFB + 0.3);
  F.bracket(["QB", "J", "B"], p5.at("both behind"), t11 - 0.25);                 // the three in a row that make the letter
  hud.name("iForm", tI); film.hit("thock", tI);
  hud.nameOff(t11 - 0.25); F.go("single", t11); hud.digits("single", t11 + 0.3);
  hud.name("single", p5.at("behind the quarterback: singleback", 0.9));

  // ---- 6. where the receivers go: back to the playbook view to count each side
  const t6 = p6.at("Then the receivers"), t8 = p7.at("in two steps");
  hud.heading("Where: the receivers", t6, "head-receivers"); hud.nameOff(t6 - 0.25);
  F.go("doubles", t6, { stagger: { B: 0.15 } }).light(t6 + 0.2, ["five"]).cam.go("top", t6, { dur: 2.0 });
  const tC = p6.at("Count each side"), tT = p6.at("Three to one side"), tB = p6.at("Squeeze those three"), tBn = p6.at("for a bunch");
  const tX = p6.at("crossing routes"), tM = p6.at("defenders in man coverage"), tE = p6.at("out wide too");
  const n = k => D.read(D.STATE[k]), cnt = o.count, big = { px: cnt.px, font: "mono", color: "ink" };
  F.label(cnt.L, [[tC, String(n("doubles").left)], [tT + 0.5, String(n("trips").left)], [tE + 0.5, String(n("empty").left)]], tC, t8 - 0.25, big);
  F.label(cnt.R, [[tC, String(n("doubles").right)], [tT + 0.5, String(n("trips").right)]], tC + 0.25, tX - 0.25, big);
  F.label(cnt.R, String(n("empty").right), tE + 0.5, t8 - 0.25, big);
  hud.name("doubles", p6.at("is doubles"));
  F.go("trips", tT); hud.name("trips", p6.at("is trips"));
  F.go("bunch", tB); hud.name("bunch", tBn); film.hit("thock", tB + 0.6);
  F.bracket(["Y", "J", "Z"], tBn, tX - 0.2, { pad: 1.5 });
  // two routes that cross, then a defender over each of the three: the two outside defenders are carried into the middle one
  const [ix, iz] = F.xz("bunchIn"), [px] = F.xz("bunchPoint"), [ox, oz] = F.xz("bunchOut"), up = o.routeTop ?? 4.8;
  F.arrow([ix + 0.5, iz + 0.6], [ox + 3.2, up], tX, tE - 0.3, { bend: 0.16, color: "ink" }).arrow([ox - 0.5, oz + 0.6], [ix - 3.2, up], tX + 0.2, tE - 0.3, { bend: -0.16, color: "ink" });
  const dz = o.defZ ?? 1.9, gap = o.defGap ?? 0.85;
  F.defender([ix - 0.3, dz], tM, tE - 0.3, { to: [px - gap, dz], move: tM + 0.7 }).defender([px, dz], tM + 0.12, tE - 0.3).defender([ox + 0.3, dz], tM + 0.24, tE - 0.3, { to: [px + gap, dz], move: tM + 0.7 });
  F.go("empty", tE).cam.go("tv", tE + 0.3, { dur: 2.2 });
  hud.name("empty", p6.at("backfield is empty")); film.hit("thock", tE + 0.55);   // as the back lands out wide, clear of the next stressed word

  // ---- 7. reading a snap, from the stands
  hud.heading("Read it in two steps", t8, "head-read"); hud.nameOff(t8 - 0.25);
  F.go("base", t8).light(t8 + 0.2, ["line", "QB", "five"]);
  F.pulse(F.five, p7.at("When it substitutes"));
  const tN = p7.at("count the backs"), tPers = p7.at("That is the personnel"), tZ = p7.at("every snap");
  F.pulse("B", tN).ring("B", tN, tPers + 0.6).pulse("Y", tN + 0.35).ring("Y", tN + 0.35, tPers + 0.6);
  hud.pulseDigits(tPers); film.hit("tick", tPers, { pitch: 3 });
  hud.note("the defense\ngets to match", p7.at("gets to match it"), p7.at("where they line up", -0.25));
  const tW = p7.at("where they line up"), tS = p7.at("The same eleven"), tSeven = p7.at("seven on the line");
  F.go("trips", tW); hud.name("trips", tW + 0.5);
  F.go("bunch", tS); hud.name("bunch", tS + 0.5);
  F.seven(tSeven + 0.1).label(o.sevenAt || [0, 3.2], "7", tSeven + 0.1, tZ + 0.8, { px: cnt.px, font: "mono", color: "accent" });
  F.go("empty", tZ); hud.name("empty", tZ + 0.5); film.hit("chord", tZ + 0.6);
  // the snap: every eligible man releases downfield
  const rel = { X: [1.5, 9, 0.1], B: [-1.2, 7, -0.12], Y: [-3.5, 8, -0.2], J: [-2.6, 5.5, 0.14], Z: [1.6, 6.5, 0.18], ...(o.rel || {}) };
  const rs = o.routeScale ?? 1;
  Object.keys(rel).forEach((id, i) => { const [x, z] = F.xz(D.STATE.empty.at[id]), [dx, dzz, bend] = rel[id]; F.arrow([x + dx * 0.12, z + 1.1], [x + dx * rs, dzz * rs], tZ + 1.0 + i * 0.07, 1e9, { bend, color: D.STATE.empty.role[id], dur: 0.8 }); });
};
