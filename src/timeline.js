// MERIDIAN STATION — deterministic timeline (pure, seekable, no Three.js dependency)
// All state is a pure function of film time t (seconds, 0..90). Scrubbing reconstructs exact state.

export const DURATION = 90;
export const LIFE_END = 30; // 0:30 exact boundary — no Tiger/damage before this
export const CHAPTERS = [
  { id: 'ch-open',    label: 'Opening — intact ring',        start: 0,  end: 8,  month: 0 },
  { id: 'ch-cart',    label: 'Cart & crew',                  start: 8,  end: 20, month: 0 },
  { id: 'ch-chapel',  label: 'Chapel — competent',           start: 20, end: 30, month: 0 },
  { id: 'ch-m1',      label: 'M1 — first cut',               start: 30, end: 40, month: 1 },
  { id: 'ch-m2',      label: 'M2 — relay section lost',      start: 40, end: 50, month: 2 },
  { id: 'ch-m3',      label: 'M3 — recurrence',              start: 50, end: 60, month: 3 },
  { id: 'ch-m4',      label: 'M4 — hydroponics cut',         start: 60, end: 70, month: 4 },
  { id: 'ch-m5',      label: 'M5 — reliquaries',             start: 70, end: 80, month: 5 },
  { id: 'ch-m6',      label: 'M6 — bloom & return',          start: 80, end: 90, month: 6 },
];

export const SCARS = [
  { id: 'scar.docking.arm01.removed',        month: 1, at: 30 },
  { id: 'scar.transit.relay.segment02.removed', month: 2, at: 40 },
  { id: 'scar.habitation.north.vented',      month: 3, at: 50 },
  { id: 'scar.hydroponics.spine.cut',        month: 4, at: 60 },
  { id: 'scar.relay.sail.integration',       month: 5, at: 70 },
  { id: 'scar.monument.radial.resolution',   month: 6, at: 80 },
];

// Stable entity IDs — never renamed; Last Shift matches on these.
export const ENTITY_IDS = [
  'structure.ring', 'structure.spire', 'structure.lower_spine',
  'structure.docking.arm01', 'structure.docking.arm02', 'structure.docking.arm03',
  'structure.docking.arm04', 'structure.docking.arm05', 'structure.docking.arm06',
  'structure.docking.arm07', 'structure.docking.arm08', 'structure.docking.arm09',
  'structure.docking.arm10', 'structure.docking.arm11', 'structure.docking.arm12',
  'structure.transit.segment02', 'structure.relay', 'structure.antenna_lattice',
  'structure.thermal_sails', 'structure.chapel', 'structure.chapel.pane',
  'structure.hydro_rack', 'structure.habitation_north',
  'path.dock_terminal', 'path.ring_service_bypass', 'path.hydro_direct',
  'pressure.dock_isolation_seal', 'pressure.habitation_north_sealed_edge',
  'crew.mara', 'crew.rin', 'crew.survivor', 'crew.hesh', 'crew.kira',
  'crew.jalen', 'crew.safi', 'prop.cart', 'prop.wrench', 'prop.cart_caster',
  'craft.transfer', 'entity.tiger',
];

export function clamp01(x) { return Math.min(1, Math.max(0, x)); }
export function smooth(x) { const t = clamp01(x); return t * t * (3 - 2 * t); }
export function seg(t, a, b) { return smooth((t - a) / (b - a)); }

export function monthAt(t) {
  if (t < 30) return 0;
  if (t < 40) return 1;
  if (t < 50) return 2;
  if (t < 60) return 3;
  if (t < 70) return 4;
  if (t < 80) return 5;
  return 6;
}

export function scarsAt(t) {
  return SCARS.filter(s => t >= s.at).map(s => s.id);
}

export function chapterAt(t) {
  return CHAPTERS.find(c => t >= c.start && t < c.end) || CHAPTERS[CHAPTERS.length - 1];
}

/**
 * Full deterministic world state at time t.
 * Pure function: same t => same state, regardless of playback history.
 */
export function stateAt(t, recurrenceVariant = 'audience') {
  t = Math.min(DURATION, Math.max(0, t));
  const month = monthAt(t);
  const scars = scarsAt(t);
  const has = id => scars.includes(id);

  // M1 (30-40): arm01 detaches 31-37, seal closes 34-38, bypass opens 36-39
  const armDetach = seg(t, 31, 37);
  const sealClose = seg(t, 34, 38);
  const bypassOpen = seg(t, 36, 39);
  // M2 (40-50): segment02 leaves 41-47
  const seg02Leave = seg(t, 41, 47);
  // M3 (50-60): vent 51-55; Mara/Rin pass1 52-56, pass2 56.5-59.5
  const vent = seg(t, 51, 55);
  const pass1 = seg(t, 52, 56);
  const pass2 = seg(t, 56.5, 59.5);
  // M4 (60-70): hydro cut 61-66, debris 62-69
  const hydroCut = seg(t, 61, 66);
  const hydroDebris = seg(t, 62, 69);
  // M5 (70-80): reliquaries settle 71-78
  const reliquary = seg(t, 71, 78);
  // M6 (80-90): hands 80-83, exterior orbit 83-87, bloom 84-88, return 87.5-90
  const finaleOut = seg(t, 82.5, 84.5);
  const bloom = seg(t, 84, 88);
  const finaleBack = seg(t, 87.5, 89);

  return {
    t, month, scars, recurrenceVariant,
    // docking
    arm01Attached: t < 31 ? 1 : 1 - armDetach,
    arm01Detached: armDetach,
    sealClosed: sealClose,          // 0 open route, 1 sealed
    bypassOpen,
    cartDamaged: t >= 30 ? 1 : 0,   // loose caster lost at M1
    cartOnBypass: t >= 36 ? bypassOpen : 0,
    // relay
    segment02Attached: t < 41 ? 1 : 1 - seg02Leave,
    relayCircuitLive: t < 41 ? 1 : 1 - seg02Leave,
    // habitation
    habitationVented: vent,
    maraPass1: pass1, maraPass2: pass2,
    // hydro
    hydroCut, hydroDebris,
    irrigationLive: t < 61 ? 1 : 1 - hydroCut,
    // reliquaries
    reliquary,
    // finale
    finaleOut, bloom, finaleBack,
    // Tiger: never before 30; implied 30-80 (offscreen), silhouette 80+
    tigerVisible: t >= 80 ? 1 : 0,
    tigerImplied: t >= 30 && t < 80 ? 1 : 0,
    // lights: chapel primary dies in M6 (scar.monument)
    chapelLight: t < 80 ? 1 : 1 - seg(t, 85, 88) * 0.55, // last lit room keeps one practical
    witnessAir: t >= 60 ? 1 : 1, // witness pocket always has air/light after M4
  };
}

// Camera keyframes per shot: [tStart, tEnd, posFrom, posTo, tgtFrom, tgtTo]
// Positions are in world units (interior ~meters, exterior ~km-scale units).
export const SHOTS = [
  // 0-8 exterior reveal + docking approach
  { id: 's-open', a: 0, b: 8,
    p0: [260, 90, 320], p1: [60, 18, 95], t0: [0, 20, 0], t1: [38, 6, 0] },
  // 8-20 interior corridor: cart crosses threshold, Mara/Rin, hydro rack
  { id: 's-cart', a: 8, b: 20,
    p0: [-14, 3.2, 6], p1: [10, 2.6, 5], t0: [-10, 1.2, 0], t1: [6, 1.4, -2] },
  // 20-30 chapel wide (saved pose, reused in Last Shift)
  { id: 's-chapel', a: 20, b: 30,
    p0: [0, 3.4, 10], p1: [0, 2.8, 8.5], t0: [0, 2.2, -14], t1: [0, 2.0, -14] },
  // 30-40 docking cut: same alignment as opening, then seal + bypass interior
  { id: 's-m1', a: 30, b: 40,
    p0: [70, 22, 110], p1: [-8, 2.8, 5], t0: [38, 6, 0], t1: [-4, 1.2, 0] },
  // 40-50 relay section + Hesh
  { id: 's-m2', a: 40, b: 50,
    p0: [150, 60, 160], p1: [95, 28, 95], t0: [60, 10, -40], t1: [62, 12, -38] },
  // 50-60 recurrence viewport lane (variant shifts framing/attention)
  { id: 's-m3', a: 50, b: 60,
    p0: [-9, 2.6, 7], p1: [9, 2.4, 6], t0: [0, 1.6, -6], t1: [0, 1.6, -6] },
  // 60-70 hydro rack return
  { id: 's-m4', a: 60, b: 70,
    p0: [-12, 2.8, 6], p1: [8, 2.2, 4], t0: [4, 1.3, -3], t1: [4, 1.3, -3] },
  // 70-80 reliquaries exterior
  { id: 's-m5', a: 70, b: 80,
    p0: [180, 80, 200], p1: [90, 30, 110], t0: [0, 30, 0], t1: [20, 25, -20] },
  // 80-90 finale: hands -> exterior orbit -> bloom -> hands
  { id: 's-m6', a: 80, b: 90,
    p0: [0, 2.4, 2], p1: [0, 2.4, 2], t0: [0, 1.9, -3], t1: [0, 1.9, -3] },
];

export function shotAt(t) {
  return SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
}

export function cameraAt(t, recurrenceVariant = 'audience') {
  const s = shotAt(t);
  const k = smooth((t - s.a) / (s.b - s.a));
  const lerp = (a, b) => a + (b - a) * k;
  let pos = [lerp(s.p0[0], s.p1[0]), lerp(s.p0[1], s.p1[1]), lerp(s.p0[2], s.p1[2])];
  let tgt = [lerp(s.t0[0], s.t1[0]), lerp(s.t0[1], s.t1[1]), lerp(s.t0[2], s.t1[2])];

  // M6 finale camera path: hands (80-83) -> pull outside -> orbit past Virgil (83-87) -> return (87.5-90)
  if (t >= 80) {
    const out = seg(t, 82.5, 84.5);       // 0 inside, 1 outside
    const orbit = seg(t, 83, 87);         // orbit progress
    const back = seg(t, 87.5, 89);        // return
    const ang = orbit * Math.PI * 1.1;
    const R = 40 + out * 260;
    const cx = Math.sin(ang) * R, cz = Math.cos(ang) * R;
    const inside = [0, 2.4, 2], insideT = [0, 1.9, -3];
    const outside = [cx, 30 + orbit * 40, cz], outsideT = [0, 20, 0];
    const mix = out * (1 - back);
    pos = [
      inside[0] + (outside[0] - inside[0]) * mix,
      inside[1] + (outside[1] - inside[1]) * mix,
      inside[2] + (outside[2] - inside[2]) * mix,
    ];
    tgt = [
      insideT[0] + (outsideT[0] - insideT[0]) * mix,
      insideT[1] + (outsideT[1] - insideT[1]) * mix,
      insideT[2] + (outsideT[2] - insideT[2]) * mix,
    ];
  }

  // M3 recurrence variants: same lane, different framing + attention cue.
  if (t >= 50 && t < 60) {
    if (recurrenceVariant === 'witness') {
      // tighter on witness (survivor at console), Mara/Rin cross at frame edge first
      pos = [pos[0] * 0.55, pos[1] + 0.4, pos[2] * 0.7];
      tgt = [tgt[0] + 1.5, tgt[1] + 0.3, tgt[2]];
    } else {
      // audience-first: wider, lane centered so wrench reads
      pos = [pos[0] * 1.15, pos[1] - 0.2, pos[2] * 1.15];
    }
  }
  return { pos, tgt, shot: s.id };
}

// Last Shift comparison definitions (matched camera + IDs)
export const COMPARISONS = [
  { id: 'cmp-dock',  label: 'Docking / cart / seal + bypass', tIntact: 12, tCut: 38, cam: 'dock' },
  { id: 'cmp-hydro', label: 'Hydroponics rack — irrigation stopped', tIntact: 14, tCut: 66, cam: 'hydro' },
  { id: 'cmp-chapel', label: 'Chapel — intact / recurrence / ruin', tIntact: 25, tCut: 88, cam: 'chapel' },
];

export function comparisonCamera(kind) {
  if (kind === 'dock') return { pos: [-8, 2.8, 5], tgt: [-4, 1.2, 0] };
  if (kind === 'hydro') return { pos: [-12, 2.8, 6], tgt: [4, 1.3, -3] };
  return { pos: [0, 2.8, 8.5], tgt: [0, 2.0, -14] }; // chapel saved pose
}
