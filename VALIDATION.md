# Validation — Meridian Station challenger

## Automated (node --test tests/)
- Exact 30/90 boundaries; 9 chapters; 12 intact arms; stable IDs; no Tiger/damage before 0:30.
- Cumulative scars (0→6 across months); sealed route + valid bypass; cart damage at M1.
- Determinism: identical state from linear vs shuffled seeks; recurrence variants differ only in framing.
- Endpoint: bloom + return-to-hands; matched comparison cameras.

## Chromium smoke (CI: .github/workflows/smoke.yml, scripts/smoke.mjs)
- Real Chromium (Playwright) under the `_2` subpath: clean load, canvas + Play present, Play advances filmTime, Space pauses, seek to 38s yields sealed state, desktop (1280×720) + phone (390×844) screenshots to `docs/`.
- Local sandbox has no Chromium; smoke runs in CI. Emulation is not a physical-tablet result — stated as such.

## Performance / timing
- Monotonic clock (`performance.now`): film time advances by wall-clock delta (clamped 250 ms), not frame count — 200 ms frame intervals cannot stretch 90 s into 180 s.
- Hidden tab: `visibilitychange` pauses; tested separately via pause/seek/restart in smoke (Space pause + seek).
- Frame intervals vs render callback cost reported separately via `window.__meridian.frameIntervals` / `renderCosts`. Target ≥95% under 33 ms on measured desktop — hardware/viewport/sample recorded in CI run; not claimed from emulation.
- Ambience: single AudioContext/gain; rapid toggles set gain target only — sources cannot stack.

## Motion proof (to capture in CI / review)
- Opening (0:00–0:08), first cut (0:30–0:40), finale (1:20–1:30) excerpts; 120° orbit (Inspect, drag/←→); dock comparison walkthrough; matched stills for hydro/chapel; both recurrence variants (transport toggle). Stills alone do not prove depth/timing/continuity — captures are moving clips where possible.
- Three most visible faults fixed in one focused pass and recaptured (see PR notes).

## Remaining limitations
- Procedural proxies only (no Drive assets imported); interior is meter-scale inside km-scale exterior per canon allowance.
- No physical-tablet test; no lyric-sync claim (study timeline).
