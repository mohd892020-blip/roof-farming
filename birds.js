'use strict';
/* =========================================================
   birds.js — العصافير: تطير حول السطح، تقف على السور والخزان،
   وتنزل على النباتات التي تكبر (منطقها في game.js، وهنا الرسم والحركة فقط)
   كلما زادت النباتات التي تكبر زاد نشاط العصافير.
   ========================================================= */

const Birds = (() => {
  const SPARROW = `<svg class="sparrow" viewBox="0 0 44 32" aria-hidden="true">
    <path d="M30 16 L43 10 L42 19Z" fill="#7a5230"/>
    <ellipse cx="24" cy="18" rx="12" ry="9" fill="#b07a45"/>
    <ellipse cx="21" cy="21" rx="8" ry="5.5" fill="#f1dfc0"/>
    <path class="wing" d="M19 15 Q28 7 35 16 Q27 22 19 18Z" fill="#7a5230"/>
    <path d="M23 14 Q27 13 30 16 M22 17 Q26 16 29 18" stroke="#c9995e" stroke-width="1" fill="none"/>
    <circle cx="13" cy="12" r="7.5" fill="#8a5a2e"/>
    <path d="M7 10 Q12 3 19 9 Q13 8 7 10Z" fill="#6b4220"/>
    <ellipse cx="12" cy="14.5" rx="4" ry="2.6" fill="#f1dfc0"/>
    <circle cx="10.5" cy="11" r="1.7" fill="#1f1308"/><circle cx="10" cy="10.4" r=".5" fill="#fff"/>
    <path d="M6 12 L1 13.6 L6 15.2Z" fill="#f0a83a"/>
    <path class="legs" d="M21 26.5 v4 M26 26.5 v4" stroke="#c08040" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  let ambientTimer = 0;

  const layer = () => UI.el.birdLayer;
  const sceneRect = () => UI.el.scene.getBoundingClientRect();
  const perchOf = i => { const b = UI.plotEl(i); return b && b.querySelector('.perch'); };

  function makeFlyer(x, y, faceRight) {
    const f = document.createElement('div');
    f.className = 'flyer';
    f.innerHTML = `<div class="bird-body">${SPARROW}</div>`;
    f.querySelector('.sparrow').classList.add('flying');
    if (faceRight) f.classList.add('face-right');
    f.style.transform = `translate(${x}px, ${y}px)`;
    layer().appendChild(f);
    return f;
  }

  /* ---------- العصافير على النباتات ---------- */

  // نزول عصفور على نبتة (مع حركة طيران من خارج الشاشة)
  function land(i) {
    const perch = perchOf(i);
    if (!perch) return;
    perch.innerHTML = SPARROW;
    const bird = perch.firstElementChild;
    if (document.hidden) return;
    const fromRight = Math.random() < .5;
    bird.classList.add('flying');
    if (!fromRight) perch.classList.add('face-right');
    else perch.classList.remove('face-right');
    perch.animate([
      { transform: `translate(${fromRight ? 170 : -170}px, -190px)` },
      { transform: `translate(${fromRight ? 40 : -40}px, -40px)`, offset: .7 },
      { transform: 'translate(0, 0)' },
    ], { duration: 1100, easing: 'ease-out' }).onfinish = () => bird.classList.remove('flying');
  }

  // طيران العصفور من النبتة (بنفسه أو لأن الطفل طيّره)
  function leave({ index, shooed }) {
    const perch = perchOf(index);
    if (!perch || !perch.firstElementChild) return;
    const r = perch.getBoundingClientRect();
    perch.innerHTML = '';
    if (document.hidden || !r.width) return;
    const sc = sceneRect();
    const x = r.left - sc.left, y = r.top - sc.top;
    const right = x < sc.width / 2;
    const f = makeFlyer(x, y, right);
    if (shooed) {
      const puff = document.createElement('div');
      puff.className = 'shoo-puff';
      puff.textContent = '💨';
      puff.style.transform = `translate(${x}px, ${y}px)`;
      layer().appendChild(puff);
      puff.animate([{ opacity: 1, transform: `translate(${x}px, ${y}px) scale(.6)` }, { opacity: 0, transform: `translate(${x}px, ${y - 20}px) scale(1.4)` }],
        { duration: 600 }).onfinish = () => puff.remove();
    }
    f.animate([
      { transform: `translate(${x}px, ${y}px)` },
      { transform: `translate(${x + (right ? 60 : -60)}px, ${y - 70}px)`, offset: .3 },
      { transform: `translate(${x + (right ? 260 : -260)}px, ${y - 300}px)` },
    ], { duration: shooed ? 800 : 1400, easing: 'ease-in', fill: 'forwards' }).onfinish = () => f.remove();
  }

  // مطابقة الرسم مع الحالة (بعد إعادة التحميل مثلاً)
  function sync() {
    Game.state.plots.forEach((plot, i) => {
      const perch = perchOf(i);
      if (!perch) return;
      const has = !!(plot.crop && plot.crop.bird);
      if (has && !perch.firstElementChild) perch.innerHTML = SPARROW;
      else if (!has && perch.firstElementChild) perch.innerHTML = '';
    });
  }

  /* ---------- عصافير الزينة: تطير وتقف على السور والخزان ---------- */

  function growingCount() {
    return Game.state.plots.filter((p, i) => { const c = Game.cropInfo(i); return c && !c.ready; }).length;
  }

  function perchSpots(sc) {
    const spots = [];
    const wall = document.querySelector('.back-wall').getBoundingClientRect();
    for (let k = 0; k < 3; k++) spots.push({ x: sc.width * (0.2 + 0.25 * k) + (Math.random() * 30 - 15), y: wall.top - sc.top - 24 });
    const tank = document.querySelector('.decor.tank').getBoundingClientRect();
    spots.push({ x: tank.left - sc.left + tank.width * .45, y: tank.top - sc.top - 14 });
    const line = document.querySelector('.decor.clothesline').getBoundingClientRect();
    spots.push({ x: line.left - sc.left + line.width * .5, y: line.top - sc.top + 2 });
    return spots;
  }

  function ambientFlight(delay) {
    const sc = sceneRect();
    const sky = document.querySelector('.sky-area').getBoundingClientRect();
    const fromRight = Math.random() < .5;
    const startX = fromRight ? sc.width + 30 : -50;
    const endX = fromRight ? -50 : sc.width + 30;
    const y = sky.top - sc.top + sky.height * (0.25 + Math.random() * 0.4);
    const f = makeFlyer(startX, y, !fromRight);
    f.style.opacity = 0;

    if (Math.random() < 0.55) {
      // يطير، يقف على السور أو الخزان أو حبل الغسيل، ثم يكمل طريقه
      const spots = perchSpots(sc);
      const spot = spots[Math.floor(Math.random() * spots.length)];
      f.animate([
        { transform: `translate(${startX}px, ${y}px)`, opacity: 1 },
        { transform: `translate(${(startX + spot.x) / 2}px, ${Math.min(y, spot.y) - 40}px)`, opacity: 1, offset: .6 },
        { transform: `translate(${spot.x}px, ${spot.y}px)`, opacity: 1 },
      ], { duration: 1800, delay, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
        const sp = f.querySelector('.sparrow');
        sp.classList.remove('flying');
        f.querySelector('.bird-body').classList.add('hopping');
        setTimeout(() => {
          f.querySelector('.bird-body').classList.remove('hopping');
          sp.classList.add('flying');
          f.classList.toggle('face-right', endX > spot.x);
          f.animate([
            { transform: `translate(${spot.x}px, ${spot.y}px)`, opacity: 1 },
            { transform: `translate(${(spot.x + endX) / 2}px, ${spot.y - 90}px)`, opacity: 1, offset: .5 },
            { transform: `translate(${endX}px, ${spot.y - 150}px)`, opacity: 1 },
          ], { duration: 1800, easing: 'ease-in', fill: 'forwards' }).onfinish = () => f.remove();
        }, 2500 + Math.random() * 4000);
      };
    } else {
      f.animate([
        { transform: `translate(${startX}px, ${y}px)`, opacity: 1 },
        { transform: `translate(${(startX * 2 + endX) / 3}px, ${y - 30}px)`, opacity: 1 },
        { transform: `translate(${(startX + endX * 2) / 3}px, ${y + 10}px)`, opacity: 1 },
        { transform: `translate(${endX}px, ${y - 20}px)`, opacity: 1 },
      ], { duration: 4200, delay, easing: 'linear', fill: 'forwards' }).onfinish = () => f.remove();
    }
  }

  function scheduleAmbient() {
    const g = growingCount();
    // نشاط أكثر كلما زادت النباتات التي تكبر
    const wait = g ? Math.max(3500, 11000 - g * 1200) : 18000 + Math.random() * 12000;
    ambientTimer = setTimeout(() => {
      const locked = UI.el.app.classList.contains('locked'); // العصافير نايمة أيضاً
      if (!document.hidden && !locked && layer().childElementCount < 8) {
        const flock = g >= 4 ? 3 : g >= 1 ? 2 : 1;
        for (let k = 0; k < flock; k++) ambientFlight(k * 350);
      }
      scheduleAmbient();
    }, wait);
  }

  function init() {
    Game.on('birdLand', land);
    Game.on('birdLeave', leave);
    sync();
    clearTimeout(ambientTimer);
    setTimeout(() => ambientFlight(0), 1500);
    scheduleAmbient();
  }

  return {
    init, sync,
    // أيقونة الفزاعة للنوافذ والبطاقات (نسخة من الرسم الموجود على السطح)
    get SCARECROW_ICON() {
      return document.getElementById('scarecrow').outerHTML
        .replace(' id="scarecrow"', '')
        .replace(/ hidden(="")?/, '')
        .replace('class="decor scarecrow"', 'class="scarecrow-icon"')
        .replace(/<path[^>]*url\(#plaid\)[^>]*\/>/, '')
        .replace(/<defs>[\s\S]*<\/defs>/, '');
    },
  };
})();
