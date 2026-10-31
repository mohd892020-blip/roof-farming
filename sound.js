'use strict';
/* =========================================================
   sound.js — أصوات قصيرة وهادئة بدون ملفات (Web Audio API)،
   وموسيقى خلفية اختيارية مطفأة افتراضياً. يتحكم فيها الأهل.
   ========================================================= */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let musicTimer = 0;
  let musicStep = 0;

  const P = () => (Game.state ? Game.state.parent : null);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, at, dur, { type = 'sine', vol = 0.5, slide = 0 } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(master);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function noise(at, dur, { vol = 0.3, freq = 1200 } = {}) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = buf;
    f.type = 'lowpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(at);
  }

  const FX = {
    plant: t => { noise(t, .12, { vol: .25, freq: 500 }); tone(220, t + .05, .12, { type: 'triangle', vol: .3 }); },
    water: t => { [0, .09, .18].forEach((d, k) => tone(700 + k * 180, t + d, .14, { vol: .3, slide: 1300 + k * 160 })); noise(t, .3, { vol: .08, freq: 2600 }); },
    harvest: t => { tone(523, t, .14, { type: 'triangle', vol: .4 }); tone(784, t + .1, .2, { type: 'triangle', vol: .4 }); },
    coin: t => { tone(1320, t, .08, { type: 'square', vol: .12 }); tone(1760, t + .07, .16, { type: 'square', vol: .12 }); },
    level: t => { [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * .12, .26, { type: 'triangle', vol: .42 })); },
    gift: t => { [659, 880, 1109].forEach((f, k) => tone(f, t + k * .09, .2, { vol: .35 })); },
    shoo: t => { noise(t, .2, { vol: .2, freq: 3000 }); tone(900, t, .18, { vol: .18, slide: 1600 }); },
    pop: t => { tone(420, t, .1, { vol: .35, slide: 900 }); },
    tap: t => { tone(600, t, .05, { type: 'triangle', vol: .22 }); },
    soft: t => { tone(330, t, .16, { type: 'triangle', vol: .22, slide: 260 }); },
    purr: t => { for (let k = 0; k < 8; k++) tone(62, t + k * .07, .06, { type: 'sawtooth', vol: .16 }); },
  };

  function play(name) {
    const p = P();
    if (!p || !p.sound || !unlocked || !FX[name] || !ensure()) return;
    FX[name](ctx.currentTime + 0.01);
  }

  /* موسيقى هادئة: نوتات متباعدة من سلم خماسي */
  const NOTES = [392, 440, 523, 587, 659, 523, 440, 587];

  function musicTick() {
    tone(NOTES[musicStep % NOTES.length], ctx.currentTime + 0.02, 1.7, { type: 'sine', vol: .14 });
    if (musicStep % 4 === 0) tone(NOTES[musicStep % NOTES.length] / 2, ctx.currentTime + 0.02, 2.2, { type: 'triangle', vol: .09 });
    musicStep++;
    musicTimer = setTimeout(musicTick, 1300);
  }

  // تُستدعى عند تغيير الإعدادات أو القفل أو إخفاء اللعبة
  function sync() {
    const p = P();
    const locked = typeof UI !== 'undefined' && UI.el.app && UI.el.app.classList.contains('locked');
    const want = !!(p && p.music && unlocked && !document.hidden && !locked);
    if (want && !musicTimer && ensure()) musicTick();
    if (!want && musicTimer) { clearTimeout(musicTimer); musicTimer = 0; }
  }

  function init() {
    // المتصفح يسمح بالصوت بعد أول لمسة فقط
    const unlock = () => {
      unlocked = true;
      ensure();
      sync();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    document.addEventListener('visibilitychange', sync);
  }

  return { init, play, sync };
})();
