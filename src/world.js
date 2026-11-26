// MERIDIAN STATION — one coherent Three.js world.
// Exterior (km-scale units) + interior hub (meter-scale) share one origin/scene.
// All geometry is procedural proxy (see ASSET_RECEIPT.md). Persistent IDs via userData.id.
import * as THREE from 'three';
import { stateAt, cameraAt, comparisonCamera } from './timeline.js';

// Cached procedural textures (zero external dependencies)
function makeCanvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const hullTex = makeCanvasTex(256, (c, s) => {
  c.fillStyle = '#5a6b7d'; c.fillRect(0, 0, s, s);
  c.strokeStyle = '#384654'; c.lineWidth = 2;
  for (let i = 0; i <= s; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(s, i); c.stroke(); }
  c.fillStyle = '#738699';
  for (let x = 8; x < s; x += 64) for (let y = 8; y < s; y += 64) { c.fillRect(x, y, 3, 3); c.fillRect(x + 48, y + 48, 3, 3); }
});
const grateTex = makeCanvasTex(128, (c, s) => {
  c.fillStyle = '#252a30'; c.fillRect(0, 0, s, s);
  c.strokeStyle = '#4c545e'; c.lineWidth = 3;
  for (let i = 0; i <= s; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(s, i); c.stroke(); }
});
const consoleTex = makeCanvasTex(256, (c, s) => {
  c.fillStyle = '#09131c'; c.fillRect(0, 0, s, s);
  c.fillStyle = '#1b5e7a'; c.fillRect(14, 24, 96, 48); c.fillRect(126, 24, 112, 48);
  c.fillStyle = '#37f2ff'; c.fillRect(22, 34, 62, 6); c.fillRect(22, 46, 40, 4); c.fillRect(136, 36, 84, 5);
  c.fillStyle = '#ffb45e'; c.fillRect(22, 92, 28, 10); c.fillRect(58, 92, 28, 10);
});

const M = {
  hull: new THREE.MeshStandardMaterial({ color: 0x6a7c8f, map: hullTex, metalness: 0.78, roughness: 0.48 }),
  hullDark: new THREE.MeshStandardMaterial({ color: 0x2b3642, metalness: 0.72, roughness: 0.62 }),
  rib: new THREE.MeshStandardMaterial({ color: 0x944e3d, metalness: 0.42, roughness: 0.65 }), // painted structural ribs
  panel: new THREE.MeshStandardMaterial({ color: 0x8594a3, map: hullTex, metalness: 0.65, roughness: 0.45 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, metalness: 0, roughness: 0.06, transmission: 0.58, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
  warm: new THREE.MeshStandardMaterial({ color: 0xffc98a, emissive: 0xffb45e, emissiveIntensity: 1.8 }),
  cool: new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x6fc4ff, emissiveIntensity: 1.3 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x37f2ff, emissive: 0x37f2ff, emissiveIntensity: 2.6 }),
  obsidian: new THREE.MeshStandardMaterial({ color: 0x080b10, metalness: 0.45, roughness: 0.25, flatShading: true }),
  grate: new THREE.MeshStandardMaterial({ color: 0x434950, map: grateTex, metalness: 0.82, roughness: 0.72 }),
  consoleScreen: new THREE.MeshStandardMaterial({ color: 0x102838, map: consoleTex, emissive: 0x1b6d8a, emissiveMap: consoleTex, emissiveIntensity: 0.9, roughness: 0.3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x4a8a4a, roughness: 0.9 }),
  pale: new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }),
  suit: new THREE.MeshStandardMaterial({ color: 0x6b7a8a, roughness: 0.85 }),
  suit2: new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.85 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc9a184, roughness: 0.7 }),
};

function mesh(geo, mat, id, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (id) m.userData.id = id;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);

export function buildWorld(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020409);
  scene.fog = new THREE.FogExp2(0x020409, 0.00035);

  // --- Lighting: hard stellar key + restrained cold Virgil bounce + warm practicals ---
  const sun = new THREE.DirectionalLight(0xfff2dd, 3.2);
  sun.position.set(400, 300, 200); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
  scene.add(sun);
  const virgilBounce = new THREE.DirectionalLight(0x7fa8c9, 0.55);
  virgilBounce.position.set(-300, -120, -250); scene.add(virgilBounce);
  scene.add(new THREE.AmbientLight(0x223044, 0.5));
  const chapelWarm = new THREE.PointLight(0xffb45e, 12, 30, 1.6);
  chapelWarm.position.set(0, 3.6, 4); scene.add(chapelWarm);
  const hydroLight = new THREE.PointLight(0xffe0b0, 8, 22, 1.6);
  hydroLight.position.set(4, 3.2, -2); scene.add(hydroLight);
  const corridorLight = new THREE.PointLight(0xffc98a, 6, 18, 1.6);
  corridorLight.position.set(-6, 3.2, 0); scene.add(corridorLight);

  // --- Stars ---
  {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2200 + Math.random() * 800, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe4ff, size: 2.2, sizeAttenuation: false })));
  }

  // --- Virgil: cold steel-blue gas giant, pale bands, no continents ---
  const virgil = new THREE.Group(); virgil.userData.id = 'planet.virgil';
  {
    const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 256;
    const ctx = cvs.getContext('2d');
    const bands = ['#5f7d99', '#6d8ba8', '#54708c', '#7d9ab5', '#4d6884', '#8aa8c0'];
    for (let y = 0; y < 256; y++) { ctx.fillStyle = bands[Math.floor(y / 42) % bands.length]; ctx.fillRect(0, y, 512, 1); }
    const tex = new THREE.CanvasTexture(cvs);
    const sphere = mesh(new THREE.SphereGeometry(900, 48, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }), 'planet.virgil');
    const limb = new THREE.Mesh(new THREE.SphereGeometry(935, 48, 32), new THREE.MeshBasicMaterial({ color: 0x5c94c2, transparent: true, opacity: 0.18, side: THREE.BackSide }));
    virgil.add(sphere, limb);
  }
  virgil.position.set(-1400, -350, -1600);
  scene.add(virgil);

  // Two-layer starfield for orbital parallax
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const r = 2400 + (i % 3) * 800;
    const th = (i * 2.39996) % (Math.PI * 2);
    const ph = Math.acos(1 - 2 * ((i + 0.5) / 900));
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph);
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd8e8f8, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 0.75 }));
  scene.add(stars);

  // --- Exterior station: ring 8.7km OD, spire +10.4km, spine -6.9km (scaled: 1u ≈ 36m) ---
  const station = new THREE.Group(); station.userData.id = 'structure.station';
  scene.add(station);
  const RING_R = 120, TUBE_R = 16;

  // Ring: torus + outer band + ribs + habitation modules
  const ring = mesh(new THREE.TorusGeometry(RING_R, TUBE_R, 14, 72), M.hull, 'structure.ring');
  ring.rotation.x = Math.PI / 2; station.add(ring);
  const band = mesh(new THREE.TorusGeometry(RING_R + TUBE_R * 0.55, 3.2, 8, 72), M.hullDark, 'structure.ring.band');
  band.rotation.x = Math.PI / 2; station.add(band);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rib = mesh(box(2.2, 4, 7), M.rib, 'structure.ring.rib');
    rib.position.set(Math.cos(a) * (RING_R + TUBE_R * 0.4), 0, Math.sin(a) * (RING_R + TUBE_R * 0.4));
    rib.lookAt(0, 0, 0); station.add(rib);
  }
  // Habitation modules (north = +Z side)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const mod = mesh(box(10, 7, 9), M.panel, 'structure.habitation.module');
    mod.position.set(Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R);
    mod.lookAt(0, 0, 0); station.add(mod);
  }

  // Spire (+Y) and lower spine (-Y)
  const spire = mesh(cyl(2.2, 5, 290, 10), M.hull, 'structure.spire', 0, 145, 0); station.add(spire);
  const spireTip = mesh(new THREE.ConeGeometry(2.2, 26, 10), M.hullDark, 'structure.spire.tip', 0, 302, 0); station.add(spireTip);
  const spine = mesh(cyl(4, 2, 190, 10), M.hull, 'structure.lower_spine', 0, -95, 0); station.add(spine);
  const spineTip = mesh(new THREE.ConeGeometry(2, 20, 10), M.hullDark, 'structure.lower_spine.tip', 0, -200, 0);
  spineTip.rotation.x = Math.PI; station.add(spineTip);
  // Hub (interior lives here at meter scale)
  const hub = mesh(cyl(10, 10, 14, 16), M.hullDark, 'structure.hub', 0, 0, 0); station.add(hub);

  // 12 fixed non-retractable docking arms (arm01 = +X, the one that is cut)
  const arms = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const g = new THREE.Group(); g.userData.id = `structure.docking.arm${String(i + 1).padStart(2, '0')}`;
    const arm = mesh(box(34, 5, 6), M.hull, g.userData.id, 17, 0, 0);
    const collar = mesh(cyl(4.2, 4.2, 3, 12), M.rib, g.userData.id + '.collar', 33, 0, 0);
    collar.rotation.z = Math.PI / 2;
    const socket = mesh(cyl(5, 5, 2, 12), M.hullDark, g.userData.id + '.socket', 0, 0, 0);
    socket.rotation.z = Math.PI / 2;
    const latch = mesh(box(1.2, 1.2, 1.2), M.warm, g.userData.id + '.latch', 33, 2.6, 0);
    g.add(arm, collar, socket, latch);
    g.position.set(Math.cos(a) * (RING_R + TUBE_R), 0, Math.sin(a) * (RING_R + TUBE_R));
    g.rotation.y = -a;
    station.add(g); arms.push(g);
  }
  const arm01 = arms[0];

  // Relay-adjacent segment02 (ring section near relay at angle ~ -40°)
  const segment02 = new THREE.Group(); segment02.userData.id = 'structure.transit.segment02';
  {
    const arc = mesh(new THREE.TorusGeometry(RING_R, TUBE_R, 10, 10, 0.5), M.panel, 'structure.transit.segment02');
    arc.rotation.x = Math.PI / 2; arc.rotation.z = 2.4;
    segment02.add(arc);
    const relay = mesh(cyl(1.5, 1.5, 26, 8), M.hullDark, 'structure.relay', 0, 13, 0);
    const dish = mesh(new THREE.SphereGeometry(9, 16, 8, 0, Math.PI * 2, 0, 0.7), M.panel, 'structure.relay.dish', 0, 27, 0);
    dish.rotation.x = Math.PI; segment02.add(relay, dish);
    segment02.position.set(0, 0, 0);
    station.add(segment02);
  }

  // Antenna lattice + thermal sails
  const antenna = new THREE.Group(); antenna.userData.id = 'structure.antenna_lattice';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const mast = mesh(cyl(0.5, 0.5, 40, 6), M.hullDark, 'structure.antenna_lattice', Math.cos(a) * 30, 60, Math.sin(a) * 30);
    antenna.add(mast);
  }
  station.add(antenna);
  const sails = new THREE.Group(); sails.userData.id = 'structure.thermal_sails';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const sail = mesh(box(46, 0.6, 22), new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), 'structure.thermal_sails', Math.cos(a) * 70, -40, Math.sin(a) * 70);
    sail.lookAt(0, -40, 0); sails.add(sail);
  }
  station.add(sails);

  // Transfer craft (small, approaches arm01 socket)
  const craft = new THREE.Group(); craft.userData.id = 'craft.transfer';
  craft.add(
    mesh(box(4, 2, 6), M.panel, 'craft.transfer'),
    mesh(cyl(1, 1.4, 2, 8), M.hullDark, 'craft.transfer.engine', 0, 0, -4),
    mesh(box(0.4, 0.4, 0.4), M.warm, 'craft.transfer.beacon', 0, 1.15, 2.5)
  );
  craft.children[1].rotation.x = Math.PI / 2;
  scene.add(craft);

  // --- Interior hub: corridor, threshold, hydro rack, chapel ---
  const interior = new THREE.Group(); interior.userData.id = 'structure.interior';
  scene.add(interior);
  const floor = mesh(box(46, 0.4, 14), M.grate, 'structure.interior.floor', 0, 0, 0); interior.add(floor);
  const ceil = mesh(box(46, 0.4, 14), M.hullDark, 'structure.interior.ceiling', 0, 4.6, 0); interior.add(ceil);
  const wallN = mesh(box(46, 4.6, 0.4), M.panel, 'structure.interior.wall_n', 0, 2.3, 7); interior.add(wallN);
  const wallS = mesh(box(46, 4.6, 0.4), M.panel, 'structure.interior.wall_s', 0, 2.3, -7); interior.add(wallS);
  // Pressure threshold (docking route) + inner seal + service bypass door
  const threshold = mesh(box(0.6, 4.2, 6), M.rib, 'path.dock_terminal', -12, 2.1, 0); interior.add(threshold);
  const seal = mesh(box(0.5, 4.2, 6), M.hullDark, 'pressure.dock_isolation_seal', -11.2, 2.1, 0); interior.add(seal);
  const bypassDoor = mesh(box(0.5, 3, 2.4), M.rib, 'path.ring_service_bypass', -11.2, 1.5, 4.6); interior.add(bypassDoor);
  // Floor grates (worn where work happens)
  for (let i = 0; i < 8; i++) interior.add(mesh(box(2, 0.1, 3), M.grate, 'structure.interior.grate', -16 + i * 4.5, 0.25, 0));
  // Hydroponics rack: shelves, trays, roots, irrigation pipe
  const hydro = new THREE.Group(); hydro.userData.id = 'structure.hydro_rack'; hydro.position.set(6, 0, -4.5); interior.add(hydro);
  for (let s = 0; s < 3; s++) {
    hydro.add(mesh(box(8, 0.25, 2.2), M.hullDark, 'structure.hydro_rack.shelf', 0, 0.8 + s * 1.1, 0));
    hydro.add(mesh(box(7.4, 0.06, 0.14), M.cool, 'structure.hydro_rack.grow_strip', 0, 0.68 + s * 1.1, 0.7));
    for (let p = 0; p < 5; p++) hydro.add(mesh(box(1.2, 0.5, 1.6), M.green, 'structure.hydro_rack.plant', -3.2 + p * 1.6, 1.3 + s * 1.1, 0));
  }
  const irrPipe = mesh(cyl(0.12, 0.12, 8, 8), M.cool, 'structure.hydro_rack.irrigation', 0, 3.4, 0);
  irrPipe.rotation.z = Math.PI / 2; hydro.add(irrPipe);
  const farDoor = mesh(box(0.5, 3.6, 3), M.hullDark, 'structure.hydro.far_passage', 11, 1.8, -4.5); interior.add(farDoor);
  // Droplets (hydro debris)
  const droplets = [];
  for (let i = 0; i < 24; i++) {
    const d = mesh(new THREE.SphereGeometry(0.07, 6, 6), M.cool, 'structure.hydro.debris');
    d.position.set(6 + (Math.random() - 0.5) * 8, 1 + Math.random() * 2.5, -4.5 + (Math.random() - 0.5) * 2);
    d.visible = false; interior.add(d); droplets.push(d);
  }

  // Chapel: three canted two-pane bays, thick mullions, long console, grates
  const chapel = new THREE.Group(); chapel.userData.id = 'structure.chapel'; chapel.position.set(0, 0, -14); interior.add(chapel);
  const chapelFloor = mesh(box(16, 0.4, 8), M.grate, 'structure.chapel.floor', 0, 0, 0); chapel.add(chapelFloor);
  const console_ = mesh(box(10, 1.1, 1.2), M.hullDark, 'structure.chapel.console', 0, 0.75, 2.5); chapel.add(console_);
  const consoleGlow = mesh(box(9.4, 0.5, 0.1), M.consoleScreen, 'structure.chapel.console.glow', 0, 1.35, 2.5); chapel.add(consoleGlow);
  chapel.add(mesh(box(8.8, 0.08, 0.22), M.warm, 'structure.chapel.overhead_strip', 0, 3.85, 0.8));
  const panes = [];
  for (let b = 0; b < 3; b++) {
    const ang = (b - 1) * 0.38; // canted
    const bay = new THREE.Group(); bay.position.set((b - 1) * 4.6, 0, -3.6); bay.rotation.y = ang;
    for (let p = 0; p < 2; p++) {
      const pane = mesh(box(1.9, 2.6, 0.12), M.glass, 'structure.chapel.pane', (p - 0.5) * 2.1, 2.2, 0);
      bay.add(pane); panes.push(pane);
    }
    const mull = mesh(box(0.5, 3.2, 0.4), M.hullDark, 'structure.chapel.mullion', 0, 2.2, 0); bay.add(mull);
    const frameT = mesh(box(4.6, 0.4, 0.4), M.hullDark, 'structure.chapel.frame', 0, 3.7, 0); bay.add(frameT);
    const frameB = mesh(box(4.6, 0.4, 0.4), M.hullDark, 'structure.chapel.frame', 0, 0.7, 0); bay.add(frameB);
    chapel.add(bay);
  }
  // Survivor anatomy pressed to pane (finale) — modeled hands, planted pose, sculpted head
  const hands = new THREE.Group(); hands.userData.id = 'crew.survivor.hands';
  function makeHand(id, side) {
    const h = new THREE.Group(); h.userData.id = id;
    // Palm flush against pane at z = 0 in local space (placed at z = -3.45)
    h.add(mesh(box(0.16, 0.20, 0.04), M.skin, id + '.palm', 0, 0, 0));
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.042 * side;
      h.add(mesh(cyl(0.016, 0.014, 0.14, 6), M.skin, `${id}.f${f}`, fx, 0.16, 0));
    }
    const thumb = mesh(cyl(0.018, 0.015, 0.11, 6), M.skin, id + '.thumb', -0.095 * side, 0.03, 0);
    thumb.rotation.z = 0.55 * side;
    h.add(thumb);
    return h;
  }
  const handL = makeHand('crew.survivor.hand_l', 1); handL.position.set(-0.48, 2.15, -3.45);
  const handR = makeHand('crew.survivor.hand_r', -1); handR.position.set(0.48, 2.15, -3.45);
  hands.add(handL, handR); chapel.add(hands);

  const survivorGroup = new THREE.Group(); survivorGroup.userData.id = 'crew.survivor';
  // Sculpted head: cranium, jaw, brow, neck, hair
  const sCranium = mesh(new THREE.SphereGeometry(0.22, 14, 12), M.skin, 'crew.survivor.cranium', 0, 2.58, -2.85);
  sCranium.scale.set(0.9, 1.08, 0.98); survivorGroup.add(sCranium);
  const sJaw = mesh(box(0.22, 0.16, 0.22), M.skin, 'crew.survivor.jaw', 0, 2.43, -2.90); survivorGroup.add(sJaw);
  const sBrow = mesh(box(0.24, 0.05, 0.08), M.skin, 'crew.survivor.brow', 0, 2.60, -3.04); survivorGroup.add(sBrow);
  const sHair = mesh(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, 1.55), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }), 'crew.survivor.hair', 0, 2.63, -2.83);
  survivorGroup.add(sHair);
  survivorGroup.add(mesh(cyl(0.08, 0.10, 0.22, 8), M.skin, 'crew.survivor.neck', 0, 2.30, -2.82));
  // Torso, shoulders, planted legs, and forearms reaching to wrists
  survivorGroup.add(mesh(cyl(0.28, 0.34, 0.95, 10), M.suit, 'crew.survivor.body', 0, 1.75, -2.75));
  survivorGroup.add(mesh(cyl(0.11, 0.09, 0.85, 8), M.suit, 'crew.survivor.leg_l', -0.16, 0.85, -2.68));
  survivorGroup.add(mesh(cyl(0.11, 0.09, 0.85, 8), M.suit, 'crew.survivor.leg_r', 0.16, 0.85, -2.68));
  const armReachL = mesh(cyl(0.075, 0.065, 0.78, 8), M.suit, 'crew.survivor.arm_l', -0.40, 2.08, -3.10);
  armReachL.rotation.x = 1.35; armReachL.rotation.z = -0.18; survivorGroup.add(armReachL);
  const armReachR = mesh(cyl(0.075, 0.065, 0.78, 8), M.suit, 'crew.survivor.arm_r', 0.40, 2.08, -3.10);
  armReachR.rotation.x = 1.35; armReachR.rotation.z = 0.18; survivorGroup.add(armReachR);
  chapel.add(survivorGroup);

  // --- Crew figures (distinct readable silhouettes, no labels) ---
  function person(id, suitMat, hairMat, hairStyle) {
    const g = new THREE.Group(); g.userData.id = id;
    g.add(mesh(cyl(0.3, 0.4, 1.05, 10), suitMat, id + '.body', 0, 0.95, 0));
    g.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), M.skin, id + '.head', 0, 1.75, 0));
    const hair = mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, 1.4), hairMat, id + '.hair', 0, 1.82, 0);
    g.add(hair);
    if (hairStyle === 'comet') { // Mara: pale comet tail
      const tail = mesh(new THREE.ConeGeometry(0.16, 1.1, 8), hairMat, id + '.hair.tail', 0.1, 1.7, 0.45);
      tail.rotation.x = 1.1; g.add(tail);
    }
    const armL = mesh(cyl(0.09, 0.09, 0.75, 8), suitMat, id + '.arm_l', -0.42, 1.15, 0); armL.rotation.z = 0.25; g.add(armL);
    const armR = mesh(cyl(0.09, 0.09, 0.75, 8), suitMat, id + '.arm_r', 0.42, 1.15, 0); armR.rotation.z = -0.25; g.add(armR);
    g.add(mesh(cyl(0.11, 0.11, 0.8, 8), suitMat, id + '.leg_l', -0.16, 0.4, 0));
    g.add(mesh(cyl(0.11, 0.11, 0.8, 8), suitMat, id + '.leg_r', 0.16, 0.4, 0));
    return g;
  }
  const mara = person('crew.mara', M.suit2, M.pale, 'comet'); mara.position.set(-2, 0.2, 1); interior.add(mara);
  const rin = person('crew.rin', M.suit, new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }), 'short'); rin.position.set(1.5, 0.2, 1.5); interior.add(rin);
  // Rin's recognizable wrench (held, transferred)
  const wrench = new THREE.Group(); wrench.userData.id = 'prop.wrench';
  wrench.add(mesh(box(0.08, 0.5, 0.08), M.panel, 'prop.wrench.handle'));
  wrench.add(mesh(box(0.22, 0.18, 0.08), M.panel, 'prop.wrench.head', 0, 0.32, 0));
  wrench.position.set(1.9, 1.2, 1.5); interior.add(wrench);
  // Service panel Mara steadies
  const panel = mesh(box(1.6, 2.2, 0.3), M.hullDark, 'structure.service_panel', -2, 1.4, 6.6); interior.add(panel);

  // Cart: caster, lower tray, cargo
  const cart = new THREE.Group(); cart.userData.id = 'prop.cart';
  cart.add(mesh(box(2.2, 0.3, 1.4), M.rib, 'prop.cart.tray', 0, 0.55, 0));
  cart.add(mesh(box(1.8, 0.5, 1.1), M.panel, 'prop.cart.cargo', 0, 0.95, 0));
  const caster = mesh(cyl(0.22, 0.22, 0.15, 10), M.hullDark, 'prop.cart_caster', 0.9, 0.22, 0.5);
  caster.rotation.x = Math.PI / 2; cart.add(caster);
  const caster2 = mesh(cyl(0.22, 0.22, 0.15, 10), M.hullDark, 'prop.cart_caster.2', -0.9, 0.22, 0.5); caster2.rotation.x = Math.PI / 2; cart.add(caster2);
  const caster3 = mesh(cyl(0.22, 0.22, 0.15, 10), M.hullDark, 'prop.cart_caster.3', 0.9, 0.22, -0.5); caster3.rotation.x = Math.PI / 2; cart.add(caster3);
  const caster4 = mesh(cyl(0.22, 0.22, 0.15, 10), M.hullDark, 'prop.cart_caster.4', -0.9, 0.22, -0.5); caster4.rotation.x = Math.PI / 2; cart.add(caster4);
  cart.position.set(-16, 0.2, 0); interior.add(cart);

  // Landmark bodies: Hesh (relay, sunward), Kira (cryo), Jalen (antenna), Safi (sails)
  const hesh = person('crew.hesh', M.suit, M.pale, 'short'); hesh.position.set(62, 14, -38); hesh.visible = false; station.add(hesh);
  const kira = person('crew.kira', M.suit, M.pale, 'short'); kira.position.set(0, 40, 0); kira.visible = false; station.add(kira);
  const jalen = person('crew.jalen', M.suit2, M.pale, 'short'); jalen.position.set(30, 62, 0); jalen.visible = false; station.add(jalen);
  const safi = person('crew.safi', M.suit, M.pale, 'short'); safi.position.set(70, -38, 0); safi.visible = false; station.add(safi);
  // Cryo pod (Kira reliquary)
  const cryoPod = mesh(cyl(1.2, 1.2, 4, 10), M.cool, 'structure.cryo_pod', 0, 40, 0); cryoPod.visible = false; station.add(cryoPod);

  // --- Tiger: faceted obsidian, cyan fissures, 2.7432 m, no pupils/teeth/nose/wings ---
  const tiger = new THREE.Group(); tiger.userData.id = 'entity.tiger';
  {
    const body = mesh(new THREE.IcosahedronGeometry(0.55, 1), M.obsidian, 'entity.tiger.body', 0, 1.35, 0);
    body.scale.set(1, 1.5, 0.8); tiger.add(body);
    const head = mesh(new THREE.IcosahedronGeometry(0.32, 1), M.obsidian, 'entity.tiger.head', 0, 2.35, 0.15); tiger.add(head);
    for (let i = 0; i < 5; i++) { // crystal crown
      const spike = mesh(new THREE.ConeGeometry(0.07, 0.5, 5), M.obsidian, 'entity.tiger.crown', (i - 2) * 0.12, 2.75, 0.1);
      spike.rotation.z = (i - 2) * 0.25; tiger.add(spike);
    }
    for (let i = 0; i < 4; i++) { // dorsal spine
      const s = mesh(new THREE.ConeGeometry(0.09, 0.45, 5), M.obsidian, 'entity.tiger.spine', 0, 1.9 - i * 0.3, -0.35 - i * 0.08);
      s.rotation.x = -0.4; tiger.add(s);
    }
    const tail = mesh(cyl(0.06, 0.03, 1.6, 6), M.obsidian, 'entity.tiger.tail', 0, 0.7, -0.7); tail.rotation.x = 0.9; tiger.add(tail);
    for (const sx of [-1, 1]) { // digitigrade legs
      tiger.add(mesh(cyl(0.09, 0.07, 1.1, 6), M.obsidian, 'entity.tiger.leg', sx * 0.22, 0.55, 0));
      tiger.add(mesh(cyl(0.09, 0.07, 1.1, 6), M.obsidian, 'entity.tiger.leg', sx * 0.22, 0.55, -0.25));
    }
    // Cyan fissures: emissive lines on body + pupil-less eyes + dark-mineral grin silhouettes
    for (let i = 0; i < 6; i++) {
      const f = mesh(box(0.03, 0.5, 0.03), M.cyan, 'entity.tiger.fissure', (Math.random() - 0.5) * 0.6, 1.1 + Math.random() * 0.8, 0.35);
      f.rotation.z = (Math.random() - 0.5) * 0.8; tiger.add(f);
    }
    tiger.add(mesh(box(0.14, 0.04, 0.04), M.cyan, 'entity.tiger.eye_l', -0.12, 2.42, 0.42));
    tiger.add(mesh(box(0.14, 0.04, 0.04), M.cyan, 'entity.tiger.eye_r', 0.12, 2.42, 0.42));
    tiger.add(mesh(box(0.34, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 1 }), 'entity.tiger.grin', 0, 2.22, 0.42));
  }
  tiger.position.set(30, 0, 30); tiger.visible = false; scene.add(tiger);

  // No duplicate petal meshes: Month 6 bloom rearranges the actual persistent detached objects (arm01, segment02, sailR) around Tiger.

  // Vent particles (M3) + debris field (M5/M6)
  const ventPts = (() => {
    const n = 300, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 20; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfeaf2, size: 0.12, transparent: true, opacity: 0.7 }));
    p.visible = false; interior.add(p); return p;
  })();

  const refs = { scene, sun, chapelWarm, hydroLight, corridorLight, virgil, station, arm01, arms, segment02, craft,
    interior, seal, bypassDoor, threshold, hydro, irrPipe, farDoor, droplets, chapel, hands, survivorGroup,
    mara, rin, wrench, panel, cart, caster, hesh, kira, jalen, safi, cryoPod, tiger, ventPts, panes };

  function applyState(t, variant = 'audience', reduced = false) {
    const s = stateAt(t, variant);
    // Arm01: attached -> detaches and drifts (same object, tracked)
    arm01.visible = true;
    const drift = s.arm01Detached;
    arm01.position.set(Math.cos(0) * (RING_R + TUBE_R) + drift * 90, drift * 18, Math.sin(0) * (RING_R + TUBE_R) + drift * 30);
    arm01.rotation.y = drift * 0.7; arm01.rotation.z = drift * 0.4;
    // Seal closes over original route; bypass door opens; cart uses bypass, damaged (caster gone)
    seal.position.y = 2.1 - s.sealClosed * 0; seal.scale.y = 0.2 + s.sealClosed * 0.8;
    bypassDoor.visible = s.bypassOpen > 0.02;
    bypassDoor.position.y = 1.5 - s.bypassOpen * 1.2;
    caster.visible = s.cartDamaged < 0.5;
    // Cart path: intact route 8-20, bypass after M1
    const cartK = t < 30 ? Math.min(1, Math.max(0, (t - 8) / 12)) : Math.min(1, Math.max(0, (t - 36) / 4));
    cart.position.x = -16 + cartK * 22;
    cart.position.z = t >= 36 ? 3.2 : 0; // bypass lane offset
    cart.rotation.y = Math.sin(t * 0.5) * 0.03;
    // Segment02 leaves; relay circuit dies with it
    segment02.position.set(s.segment02Attached < 1 ? (1 - s.segment02Attached) * 70 : 0, (1 - s.segment02Attached) * 22, (1 - s.segment02Attached) * 40);
    segment02.rotation.y = (1 - s.segment02Attached) * 0.5;
    // Hesh appears beyond relay from M2
    hesh.visible = t >= 40;
    // Habitation vent + recurrence passes (same lane, same relationship)
    ventPts.visible = s.habitationVented > 0.02 && s.habitationVented < 1;
    ventPts.material.opacity = 0.7 * s.habitationVented;
    const laneX = (k) => -8 + k * 18;
    if (t >= 50 && t < 60) {
      mara.visible = rin.visible = true;
      const k = s.maraPass2 > 0.02 ? s.maraPass2 : s.maraPass1;
      mara.position.set(laneX(k), 0.2 + Math.sin(k * 9) * 0.15, -1);
      rin.position.set(laneX(k) + 1.2, 0.2 + Math.cos(k * 9) * 0.15, -1.4);
      mara.rotation.y = rin.rotation.y = Math.PI / 2;
      // Survivor already looking on second pass
      survivorGroup.rotation.y = s.maraPass2 > 0.02 ? 0.15 : 0;
    } else if (t < 30) {
      mara.position.set(-2 + Math.sin(t * 0.4) * 0.4, 0.2, 1); rin.position.set(1.5 + Math.cos(t * 0.5) * 0.3, 0.2, 1.5);
      mara.rotation.y = rin.rotation.y = 0;
    } else { mara.visible = rin.visible = false; }
    // Wrench transfer 12-16
    wrench.position.x = 1.9 - Math.min(1, Math.max(0, (t - 12) / 4)) * 3.5;
    // Hydro cut: far passage opens, irrigation dies, debris follows
    farDoor.position.x = 11 + s.hydroCut * 3;
    irrPipe.material = s.irrigationLive > 0.5 ? M.cool : M.hullDark;
    droplets.forEach((d, i) => { d.visible = s.hydroDebris > 0.02; d.position.y = 3 - ((t * 0.7 + i * 0.13) % 2.5); });
    // Reliquaries M5
    const rel = s.reliquary;
    kira.visible = jalen.visible = safi.visible = cryoPod.visible = rel > 0.02;
    cryoPod.position.y = 40 + (1 - rel) * 30; kira.position.y = 40 + (1 - rel) * 30;
    jalen.position.y = 62 + (1 - rel) * 20; safi.position.y = -38 + (1 - rel) * 20;
    // Tiger + bloom finale
    stars.visible = !reduced;
    tiger.visible = s.tigerVisible > 0;
    if (tiger.visible) {
      M.cyan.emissiveIntensity = 2.2 + Math.sin(t * 2.5) * 0.45;
    }
    if (s.bloom > 0.02) {
      const b = s.bloom;
      // Move the actual persistent detached objects into the bloom around Tiger (30, 0, 30)
      arm01.position.set(30 + Math.cos(b * 2) * 55 * b, 10 + b * 24, 30 + Math.sin(b * 2) * 55 * b);
      arm01.rotation.set(0, b * 0.8, 0.3 * b);
      segment02.visible = true;
      segment02.position.set(30 - Math.sin(b * 2) * 48 * b, 18 + b * 18, 30 + Math.cos(b * 2) * 48 * b);
      segment02.rotation.set(0.4 * b, b * 0.6, 0);
      sails.position.set(30 + Math.cos(b * 2 + 2) * 45 * b, 6 + b * 32, 30 + Math.sin(b * 2 + 2) * 45 * b);
      sails.rotation.set(0.2 * b, b * 0.9, 0.4 * b);
    } else {
      segment02.position.set(0, 0, 0); segment02.rotation.set(0, 0, 0);
      sails.position.set(0, 0, 0); sails.rotation.set(0, 0, 0);
    }
    // Hands: visible from 80 (pressed to pane, unmoved through return)
    hands.visible = t >= 80;
    // Hands stay on the exact same pane; survivorGroup stays planted
    // Chapel light dims but last practical stays
    chapelWarm.intensity = 12 * s.chapelLight;
    hydroLight.intensity = 8 * (t < 60 ? 1 : 0.35);
    // Craft approach 0-8
    if (t < 8) {
      const k = Math.min(1, t / 6);
      craft.position.set(120 - k * 70, 8 - k * 2, 40 - k * 28);
      craft.lookAt(38, 6, 0);
    } else craft.visible = false;
    if (t >= 8) craft.visible = false; else craft.visible = true;
    // Virgil slow rotation
    virgil.rotation.y = t * 0.002;
    return s;
  }

  return { refs, applyState, scene };
}

export function makeCamera() {
  const cam = new THREE.PerspectiveCamera(46, 1, 0.1, 8000);
  return cam;
}

export function placeCamera(cam, t, variant = 'audience') {
  const c = cameraAt(t, variant);
  cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
  cam.lookAt(c.tgt[0], c.tgt[1], c.tgt[2]);
  return c;
}
