// The Last Shift — same world state, matched camera + IDs. Not another game.
// Three substantive comparisons + 120° proof orbit (intact & cut).
// Extra renderers are initialized lazily so an Inspect failure never kills Film.
import * as THREE from 'three';
import { stateAt, comparisonCamera, COMPARISONS } from './timeline.js';

export function setupInspect(world, cam, _renderer, els) {
  const { applyState } = world;
  let cmpIndex = 0, orbitAngle = 0, orbitCut = false, dragging = false, lastX = 0;
  let rL = null, rR = null, rO = null, failed = false;

  function ensureRenderers() {
    if (failed) return false;
    if (rL && rR && rO) return true;
    try {
      rL = new THREE.WebGLRenderer({ canvas: els.cmpL, antialias: true });
      rR = new THREE.WebGLRenderer({ canvas: els.cmpR, antialias: true });
      rO = new THREE.WebGLRenderer({ canvas: els.orbitCv, antialias: true });
      [rL, rR, rO].forEach(r => { r.toneMapping = THREE.ACESFilmicToneMapping; });
      return true;
    } catch (err) {
      failed = true;
      els.leftCaption.textContent = 'Inspect WebGL unavailable';
      els.rightCaption.textContent = err?.message || 'Could not initialize comparison viewports';
      return false;
    }
  }

  function renderComparison() {
    if (!ensureRenderers()) return;
    const cmp = COMPARISONS[cmpIndex];
    const c = comparisonCamera(cmp.cam);
    cam.position.set(c.pos[0], c.pos[1], c.pos[2]); cam.lookAt(c.tgt[0], c.tgt[1], c.tgt[2]);
    applyState(cmp.tIntact, 'audience', false); rL.render(world.scene, cam);
    applyState(cmp.tCut, 'audience', false); rR.render(world.scene, cam);
    els.leftCaption.textContent = `Intact · Month 0 · ${cmp.label}`;
    els.rightCaption.textContent = `Cut · Month ${stateAt(cmp.tCut).month} · ${cmp.label}`;
  }

  function renderOrbit() {
    if (!ensureRenderers()) return;
    const t = orbitCut ? 88 : 5;
    applyState(t, 'audience', false);
    const R = 320, a = orbitAngle;
    cam.position.set(Math.cos(a) * R, 60 + Math.sin(a * 2) * 80, Math.sin(a) * R);
    cam.lookAt(0, 10, 0);
    rO.render(world.scene, cam);
    els.orbitCaption.textContent = `${orbitCut ? 'Cut' : 'Intact'} · orbit ${Math.round(((a * 180 / Math.PI) % 360 + 360) % 360)}° (drag to orbit)`;
  }

  return {
    renderComparison, renderOrbit,
    setComparison(i) { cmpIndex = i; renderComparison(); },
    setOrbitCut(v) { orbitCut = v; renderOrbit(); },
    get orbitAngle() { return orbitAngle; },
    set orbitAngle(v) { orbitAngle = v; },
    bindOrbit(canvas) {
      canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', e => { if (dragging) { orbitAngle += (e.clientX - lastX) * 0.01; lastX = e.clientX; renderOrbit(); } });
      canvas.addEventListener('pointerup', () => dragging = false);
      canvas.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { orbitAngle -= 0.15; renderOrbit(); }
        if (e.key === 'ArrowRight') { orbitAngle += 0.15; renderOrbit(); }
      });
    },
  };
}
