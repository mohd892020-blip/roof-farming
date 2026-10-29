'use strict';
/* =========================================================
   map.js — خريطة المراحل: طريق متعرّج يمر بأحياء ومناطق مختلفة،
   كل محطة مستوى، وبجانبها ما يفتحه هذا المستوى
   ========================================================= */

const LevelMap = (() => {
  const STEP = 124;        // المسافة بين محطة وأخرى
  const PAD_TOP = 190;
  const PAD_BOTTOM = 150;
  const $ = id => document.getElementById(id);
  let W = 0, H = 0;

  function pos(L) {
    return {
      x: W / 2 + W * 0.26 * Math.sin((L - 1) * 0.9),
      y: H - PAD_BOTTOM - (L - 1) * STEP,
    };
  }

  function roadPath(fromL, toL) {
    const a = pos(fromL);
    let d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}`;
    for (let L = fromL + 1; L <= toL; L++) {
      const p0 = pos(L - 1), p1 = pos(L);
      d += ` C${p0.x.toFixed(1)} ${(p0.y - STEP * .55).toFixed(1)} ${p1.x.toFixed(1)} ${(p1.y + STEP * .55).toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  }

  function rewardsOf(L) {
    if (L === 1) {
      const p = [DATA.PLANTS.mint, DATA.PLANTS.basil];
      return { icons: p.map(x => UI.Art.icon(x)), text: 'بذور نعناع وريحان' };
    }
    const list = Game.unlocksAt(L).map(u => UI.unlockLabel(u));
    if (!list.length) return { icons: ['✨'], text: 'زينة جديدة (قريباً)' };
    return { icons: list.slice(0, 2).map(x => x[0]), text: list.map(x => x[1]).join('، ') };
  }

  function build(level) {
    const N = DATA.MAP_LEVELS;
    const scroll = $('mapScroll');
    const canvas = $('mapCanvas');
    W = scroll.clientWidth;
    H = PAD_TOP + (N - 1) * STEP + PAD_BOTTOM;
    canvas.style.height = `${H}px`;
    const cur = Math.min(level, N);
    let html = '';

    // خلفيات المناطق
    const zones = DATA.MAP_ZONES;
    zones.forEach((z, k) => {
      const next = zones[k + 1];
      const bottom = k === 0 ? H : pos(z.from).y + STEP / 2;
      const top = next ? pos(next.from).y + STEP / 2 : 0;
      html += `<div class="map-zone" style="top:${top}px;height:${bottom - top}px;background:linear-gradient(to top, ${z.bottom}, ${z.top})"></div>`;
    });

    // الطريق
    const done = Math.max(1, cur);
    html += `<svg class="map-road" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <path d="${roadPath(1, N)}" stroke="#c9a26b" stroke-width="32" fill="none" stroke-linecap="round"/>
      <path d="${roadPath(1, N)}" stroke="#f6e7c6" stroke-width="25" fill="none" stroke-linecap="round"/>
      <path d="${roadPath(1, N)}" stroke="#fff" stroke-width="3" stroke-dasharray="2 13" fill="none" stroke-linecap="round"/>
      ${done > 1 ? `<path d="${roadPath(1, done)}" stroke="#ffc83d" stroke-width="9" stroke-dasharray="1 15" fill="none" stroke-linecap="round"/>` : ''}
    </svg>`;

    // زينة المناطق بين المحطات
    for (let L = 1; L < N; L++) {
      const z = zones.filter(zz => zz.from <= L).pop();
      const a = pos(L), b = pos(L + 1);
      const midX = (a.x + b.x) / 2;
      const x = midX > W / 2 ? W * 0.13 : W * 0.87;
      const y = (a.y + b.y) / 2;
      html += `<span class="map-deco" style="left:${x}px;top:${y}px">${z.deco[(L * 7) % z.deco.length]}</span>`;
      if (L % 3 === 0) {
        html += `<span class="map-deco sm" style="left:${midX > W / 2 ? W * 0.3 : W * 0.7}px;top:${y + 34}px">${z.deco[(L * 3 + 1) % z.deco.length]}</span>`;
      }
    }

    // لافتات المناطق
    zones.forEach(z => {
      const p = pos(z.from);
      const x = p.x > W / 2 ? W * 0.27 : W * 0.73;
      html += `<div class="map-sign" style="left:${x}px;top:${p.y + 58}px">${z.name}</div>`;
    });

    // المحطات
    for (let L = 1; L <= N; L++) {
      const p = pos(L);
      const state = L < level ? 'done' : L === cur && level <= N ? 'current' : L <= level ? 'done' : 'locked';
      const rw = rewardsOf(L);
      const side = p.x > W / 2 ? -1 : 1;
      html += `<button class="map-node ${state}" data-level="${L}" style="left:${p.x}px;top:${p.y}px" aria-label="المستوى ${L}">
        <span class="n">${L}</span>${state === 'done' ? '<span class="tick">✓</span>' : ''}${state === 'locked' ? '<span class="lock">🔒</span>' : ''}
      </button>
      <button class="map-reward ${state} ${side < 0 ? 'to-left' : 'to-right'}" data-level="${L}" style="left:${p.x + side * 42}px;top:${p.y}px">
        ${rw.icons.map(ic => `<span class="ri">${ic}</span>`).join('')}
      </button>`;
    }

    // البداية والنهاية
    const start = pos(1);
    html += `<div class="map-sign start" style="left:${start.x}px;top:${start.y + 70}px">🏠 ${Game.state.roofName || DATA.DEFAULT_ROOF_NAME}</div>`;
    html += `<div class="map-finish" style="left:${W / 2}px;top:${pos(N).y - 110}px">🏆<span>مراحل جديدة قريباً ✨</span></div>`;

    // اللاعب
    const crown = level > N ? '👑' : '';
    html += `<div class="map-avatar" id="mapAvatar">${crown}<span>🧑‍🌾</span></div>`;
    canvas.innerHTML = html;
  }

  function placeAvatar(L) {
    const a = $('mapAvatar');
    const p = pos(L);
    a.style.transform = `translate(${p.x}px, ${p.y - 62}px)`;
    return p;
  }

  function scrollTo(L, smooth) {
    const scroll = $('mapScroll');
    const top = pos(L).y - scroll.clientHeight * 0.55;
    scroll.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }

  function renderProgress() {
    const lv = Game.levelInfo();
    $('mapProgress').innerHTML = `<span>المستوى ${lv.level} · باقي ${lv.need - lv.into} ⭐</span>
      <span class="meter"><span class="meter-fill xp" style="width:${Math.round((lv.into / lv.need) * 100)}%"></span></span>`;
  }

  // from: المستوى السابق لتحريك اللاعب منه إلى المستوى الحالي (بعد الترقّي)
  function open({ from } = {}) {
    const level = Game.level();
    $('mapOverlay').hidden = false;
    renderProgress();
    build(level);
    const cur = Math.min(level, DATA.MAP_LEVELS);
    const start = from && from >= 1 && from < cur ? from : cur;
    const a = placeAvatar(start);
    scrollTo(start, false);
    if (start !== cur) {
      const b = pos(cur);
      setTimeout(() => {
        scrollTo(cur, true);
        $('mapAvatar').animate([
          { transform: `translate(${a.x}px, ${a.y - 62}px)` },
          { transform: `translate(${(a.x + b.x) / 2}px, ${Math.min(a.y, b.y) - 120}px)`, offset: .5 },
          { transform: `translate(${b.x}px, ${b.y - 62}px)` },
        ], { duration: 1300, easing: 'ease-in-out' }).onfinish = () => {
          placeAvatar(cur);
          const node = document.querySelector(`.map-node[data-level="${cur}"]`);
          if (node) node.classList.add('arrived');
          UI.confetti();
        };
      }, 600);
    }
  }

  function close() {
    $('mapOverlay').hidden = true;
    $('mapCanvas').innerHTML = '';
  }

  function onTap(e) {
    const t = e.target.closest('[data-level]');
    if (!t) return;
    const L = Number(t.dataset.level);
    const level = Game.level();
    const rw = rewardsOf(L);
    if (L < level) UI.toast(`المستوى ${L} ✓ ${rw.text}`, 3000);
    else if (L === level) {
      const lv = Game.levelInfo();
      UI.toast(`أنت هنا! 🧑‍🌾 باقي ${lv.need - lv.into} ⭐ للمستوى ${L + 1}`, 3000);
    } else UI.toast(`🔒 المستوى ${L}: ${rw.text}`, 3000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('mapClose').onclick = close;
    $('mapCanvas').addEventListener('click', onTap);
    window.addEventListener('resize', () => { if (!$('mapOverlay').hidden) { build(Game.level()); placeAvatar(Math.min(Game.level(), DATA.MAP_LEVELS)); } });
  });

  return { open, close };
})();
