// shared.js: the facts both cuts must agree on. Who is on the field, where each man stands in each formation (as a
// named spot, with whether that spot is on the line), and the numbers the narration quotes. Each film file draws
// these in its own frame with its own coordinates; nothing here is a pixel.
(function () {
  // ---- spots a player can stand on. lat: yards from the ball (negative is the offense's left), used only to work
  // out who is at the end of the line. on: is this spot on the line of scrimmage?
  const SPOT = {
    lt: { lat: -3, on: true }, lg: { lat: -1.5, on: true }, c: { lat: 0, on: true }, rg: { lat: 1.5, on: true }, rt: { lat: 3, on: true },
    qbUnder: { lat: 0, on: false }, qbGun: { lat: 0, on: false }, qbPistol: { lat: 0, on: false },
    wideL: { lat: -18, on: true }, wideRoff: { lat: 18, on: false },
    slotL: { lat: -10, on: false }, slotR: { lat: 10, on: false },
    wingL: { lat: -4.6, on: false }, endR: { lat: 4.6, on: true },
    deep: { lat: 0, on: false }, full: { lat: 0, on: false }, beside: { lat: 2.4, on: false }, pistolBack: { lat: 0, on: false },
    bunchPoint: { lat: 8, on: true }, bunchIn: { lat: 6.2, on: false }, bunchOut: { lat: 9.8, on: false },
  };
  // ---- the eleven. The five linemen and the quarterback are in every formation. The other five are the pieces the
  // offense places: X and Z are receivers, Y is a tight end, B is a running back, and J is the one who changes job.
  const LINE = ["lt", "lg", "c", "rg", "rt"];
  const base = { X: "wideL", Z: "wideRoff", Y: "endR", J: "slotL", B: "deep", QB: "qbUnder" };
  const WR = "WR", TE = "TE", RB = "RB";
  const roles = (j = WR) => ({ X: WR, Z: WR, Y: TE, B: RB, J: j });
  // ---- every picture the film shows: where the six movable men stand, and what job each of the five has
  const STATE = {
    base:      { name: "Singleback", at: { ...base }, role: roles() },                                   // 11 personnel, under center, two receivers a side
    twelve:    { name: "", at: { ...base, J: "wingL" }, role: roles(TE) },                               // a second tight end, a step off the line outside the left tackle
    twentyOne: { name: "", at: { ...base, J: "full" }, role: roles(RB) },                                // a second back
    under:     { name: "Under center", at: { ...base }, role: roles() },
    gun:       { name: "Shotgun", at: { ...base, QB: "qbGun", B: "beside" }, role: roles() },
    pistolQB:  { name: "Pistol", at: { ...base, QB: "qbPistol", B: "beside" }, role: roles() },          // the moment before the back drops behind
    pistol:    { name: "Pistol", at: { ...base, QB: "qbPistol", B: "pistolBack" }, role: roles() },
    iForm:     { name: "I formation", at: { ...base, J: "full" }, role: roles(RB) },
    single:    { name: "Singleback", at: { ...base }, role: roles() },
    doubles:   { name: "Doubles", sides: "2 × 2", at: { ...base, QB: "qbGun", B: "beside" }, role: roles() },
    trips:     { name: "Trips", sides: "3 × 1", at: { ...base, QB: "qbGun", B: "beside", J: "slotR" }, role: roles() },
    bunch:     { name: "Bunch", sides: "3 × 1", at: { ...base, QB: "qbGun", B: "beside", Y: "bunchPoint", J: "bunchIn", Z: "bunchOut" }, role: roles() },
    empty:     { name: "Empty", sides: "3 × 2", at: { ...base, QB: "qbGun", Y: "bunchPoint", J: "bunchIn", Z: "bunchOut", B: "slotL" }, role: roles() },
  };

  // ---- what the rule and the counting say about a state, computed from the spots (never typed)
  function read(s) {
    const men = [...LINE.map(k => ({ id: k, spot: k, lineman: true })), ...Object.keys(s.at).map(k => ({ id: k, spot: s.at[k] }))];
    const onLine = men.filter(m => SPOT[m.spot].on).sort((a, b) => SPOT[a.spot].lat - SPOT[b.spot].lat);
    const five = ["X", "Z", "Y", "J", "B"];
    const rb = five.filter(k => s.role[k] === RB).length, te = five.filter(k => s.role[k] === TE).length;
    const side = sgn => five.filter(k => { const sp = SPOT[s.at[k]]; return Math.sign(sp.lat) === sgn && !["deep", "full", "beside", "pistolBack"].includes(s.at[k]); }).length;
    return { men: men.length, onLine: onLine.map(m => m.id), ends: [onLine[0].id, onLine.at(-1).id], personnel: `${rb}${te}`, rb, te, wr: 5 - rb - te,
      left: side(-1), right: side(1), backfield: five.filter(k => ["deep", "full", "beside", "pistolBack"].includes(s.at[k])).length };
  }
  // every state must be a legal formation: eleven men, exactly seven on the line, an eligible man (never a lineman) at each end
  function problems() {
    const out = [];
    for (const [k, s] of Object.entries(STATE)) {
      const r = read(s);
      if (r.men !== 11) out.push(`${k}: ${r.men} players, not eleven`);
      if (r.onLine.length !== 7) out.push(`${k}: ${r.onLine.length} on the line, not seven`);
      if (r.ends.some(e => LINE.includes(e))) out.push(`${k}: a lineman is at the end of the line`);
      if (r.onLine.join() !== "X,lt,lg,c,rg,rt,Y") out.push(`${k}: the seven on the line are not X, the five linemen and Y`);
      if (s.sides && s.sides !== `${Math.max(r.left, r.right)} × ${Math.min(r.left, r.right)}`) out.push(`${k}: named ${s.sides} but the sides count ${r.left} and ${r.right}`);
    }
    const want = { base: "11", twelve: "12", twentyOne: "21", iForm: "21", single: "11", trips: "11", bunch: "11", empty: "11" };
    for (const k in want) if (read(STATE[k]).personnel !== want[k]) out.push(`${k}: personnel reads ${read(STATE[k]).personnel}, the narration says ${want[k]}`);
    if (read(STATE.empty).backfield !== 0) out.push("empty: a back is still in the backfield");
    return out;
  }

  // ---- the numbers the narration quotes (sources: SCRIPT.md)
  const USAGE = [                                   // share of plays by personnel grouping, league-wide, 2025 season (PFF)
    { personnel: "11", pct: 58.11 }, { personnel: "12", pct: 24.26 }, { personnel: "21", pct: 6.85 },
  ];
  const DEPTH = { shotgun: 5, pistol: 4 };          // yards behind the center, "about" (Wikipedia, List of formations)

  window.SHARED = { SPOT, LINE, STATE, read, problems, USAGE, DEPTH, WR, TE, RB };
})();
