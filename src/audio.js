// Optional nonverbal machinery ambience — OFF by default, never stacks sources.
let ctx = null, gain = null, nodes = [];
export function setAmbience(on) {
  if (on) {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain(); gain.gain.value = 0.06; gain.connect(ctx.destination);
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 55;
      const osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = 110.5;
      const g2 = ctx.createGain(); g2.gain.value = 0.4;
      osc.connect(gain); osc2.connect(g2); g2.connect(gain);
      osc.start(); osc2.start(); nodes = [osc, osc2];
    }
    ctx.resume();
    gain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.2);
  } else if (ctx && gain) {
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
}
export function ambienceOn() { return !!(ctx && gain && gain.gain.value > 0.01); }
