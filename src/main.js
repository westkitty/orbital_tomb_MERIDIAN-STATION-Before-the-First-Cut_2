// MERIDIAN STATION — Before the First Cut · challenger build
// Film is the interface. Monotonic-clock timing: 200ms frame gaps never stretch the 90s film.
import * as THREE from 'three';
import { buildWorld, makeCamera, placeCamera } from './world.js';
import { DURATION, CHAPTERS, stateAt } from './timeline.js';
import { setAmbience } from './audio.js';
import { setupInspect } from './inspect.js';

const $ = id => document.getElementById(id);
const canvas = $('gl');

let renderer = null, world = null, cam = null, inspectCtl = null;
let filmTime = 0, playing = false, reduced = false, variant = 'audience';
let lastMonotonic = performance.now(), frameIntervals = [], renderCosts = [];
let hideTimer = null, firstFrameRendered = false, webglError = false;

function showFatalError(msg) {
  webglError = true;
  $('playBig').hidden = true;
  $('playBig').disabled = true;
  const errEl = $('err');
  errEl.hidden = false;
  errEl.textContent = msg;
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  world = buildWorld(renderer);
  cam = makeCamera();
} catch (err) {
  showFatalError(
    `WebGL 3D initialization failed (${err?.message || 'no WebGL context'}). Enable hardware acceleration or open in a WebGL-capable browser to play Meridian Station.`
  );
}

function resize() {
  if (!renderer || !cam) return;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Chapters
const chSel = $('chapters');
CHAPTERS.forEach(c => {
  const o = document.createElement('option');
  o.value = String(c.start); o.textContent = `${c.label} (${fmt(c.start)})`;
  chSel.appendChild(o);
});
function fmt(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function showTransport() {
  if (webglError) return;
  $('transport').hidden = false;
  clearTimeout(hideTimer);
  if (playing) hideTimer = setTimeout(() => { if (playing) $('transport').hidden = true; }, 2600);
}
function setPlaying(v) {
  if (webglError || !firstFrameRendered) return;
  playing = v;
  $('playBig').hidden = v;
  $('btnPlay').textContent = v ? '⏸' : '▶';
  showTransport();
  if (!v) $('transport').hidden = false;
}
$('playBig').addEventListener('click', () => setPlaying(true));
$('btnPlay').addEventListener('click', () => setPlaying(!playing));
$('btnReplay').addEventListener('click', () => { filmTime = 0; syncScrub(); setPlaying(true); });
$('btnStepBack').addEventListener('click', () => { filmTime = Math.max(0, filmTime - 1); syncScrub(); });
$('btnStepFwd').addEventListener('click', () => { filmTime = Math.min(DURATION, filmTime + 1); syncScrub(); });
$('scrub').addEventListener('input', e => { filmTime = parseFloat(e.target.value); syncScrub(); });
chSel.addEventListener('change', e => { filmTime = parseFloat(e.target.value); syncScrub(); });
$('btnReduced').addEventListener('click', e => {
  if (!renderer) return;
  reduced = !reduced;
  e.currentTarget.setAttribute('aria-pressed', String(reduced));
  renderer.setPixelRatio(reduced ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !reduced;
});
$('btnAmbience').addEventListener('click', e => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  setAmbience(on);
});
$('btnVariant').addEventListener('click', e => {
  variant = variant === 'audience' ? 'witness' : 'audience';
  e.currentTarget.textContent = `Recurrence: ${variant === 'audience' ? 'Audience-first' : 'Witness-first'}`;
});
document.addEventListener('pointermove', showTransport);
document.addEventListener('keydown', e => {
  if (webglError) return;
  if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); setPlaying(!playing); }
  if (e.key === 'ArrowLeft') { filmTime = Math.max(0, filmTime - 1); syncScrub(); }
  if (e.key === 'ArrowRight') { filmTime = Math.min(DURATION, filmTime + 1); syncScrub(); }
  showTransport();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) setPlaying(false);
});

function syncScrub() {
  $('scrub').value = String(filmTime);
  $('clock').textContent = `${fmt(filmTime)} / 1:30`;
  const ch = CHAPTERS.find(c => filmTime >= c.start && filmTime < c.end);
  if (ch) chSel.value = String(ch.start);
}

if (!webglError) {
  inspectCtl = setupInspect(world, cam, renderer, {
    canvas: $('gl'), cmpL: $('cmpL'), cmpR: $('cmpR'), orbitCv: $('orbitCv'),
    leftCaption: $('capL'), rightCaption: $('capR'),
    orbitCaption: $('capOrbit'),
  });
  inspectCtl.bindOrbit($('orbitCv'));
}

$('btnInspect').addEventListener('click', () => {
  if (!inspectCtl) return;
  $('inspect').hidden = false; $('transport').hidden = true; setPlaying(false);
  inspectCtl.setComparison(parseInt($('cmpSelect').value, 10));
  inspectCtl.renderOrbit();
});
$('btnCloseInspect').addEventListener('click', () => { $('inspect').hidden = true; showTransport(); });
$('cmpSelect').addEventListener('change', e => inspectCtl?.setComparison(parseInt(e.target.value, 10)));
$('chkNarrow').addEventListener('change', e => $('cmpWrap').classList.toggle('narrow', e.target.checked));
$('chkLabels').addEventListener('change', e => {
  const box = $('labels'); box.hidden = !e.target.checked;
  if (e.target.checked) box.textContent = 'IDs: structure.docking.arm01 · path.ring_service_bypass · structure.hydro_rack · structure.chapel.pane · crew.mara · crew.rin · prop.wrench · entity.tiger';
});
$('btnOrbitCut').addEventListener('click', e => {
  const cut = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(cut));
  e.currentTarget.textContent = cut ? 'Orbit: Cut' : 'Orbit: Intact';
  inspectCtl?.setOrbitCut(cut);
});

window.__meridian = {
  get filmTime() { return filmTime; },
  set filmTime(v) { filmTime = v; },
  get firstFrameRendered() { return firstFrameRendered; },
  get webglError() { return webglError; },
  stateAt, DURATION,
  get frameIntervals() { return frameIntervals; },
  get renderCosts() { return renderCosts; },
};

function loop() {
  if (webglError) return;
  requestAnimationFrame(loop);
  const now = performance.now();
  const interval = now - lastMonotonic; lastMonotonic = now;
  frameIntervals.push(interval); if (frameIntervals.length > 600) frameIntervals.shift();

  if (playing && $('inspect').hidden) {
    const dt = Math.min(interval, 250) / 1000;
    filmTime = Math.min(DURATION, filmTime + dt);
    if (filmTime >= DURATION) setPlaying(false);
    syncScrub();
  }
  if (!$('inspect').hidden) return;

  const t0 = performance.now();
  world.applyState(filmTime, variant, reduced);
  placeCamera(cam, filmTime, variant);
  renderer.render(world.scene, cam);
  renderCosts.push(performance.now() - t0); if (renderCosts.length > 600) renderCosts.shift();

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    const playBig = $('playBig');
    playBig.disabled = false;
    playBig.removeAttribute('aria-disabled');
  }
}

syncScrub();
if (!webglError) loop();
