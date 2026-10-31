'use strict';
/* =========================================================
   cat.js — قطة السطح: تتجول وتنام وتلعب، والطفل يدلّلها ويطعمها ويرمي لها الكرة.
   لا تجوع ولا تزعل ولا تمرض أبداً، والقلوب تزيد فقط.
   ========================================================= */

const Cat = (() => {
  const SPRITE = `<svg class="cat-sprite" viewBox="0 0 64 50" aria-hidden="true">
    <path class="cat-tail" d="M49 30 Q62 28 58 12" stroke="#e8923a" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <g class="legs-back"><rect x="41" y="36" width="5.5" height="12" rx="2.7" fill="#e8923a"/><rect x="34" y="36" width="5.5" height="12" rx="2.7" fill="#f2a24a"/></g>
    <g class="legs-front"><rect x="24" y="36" width="5.5" height="12" rx="2.7" fill="#e8923a"/><rect x="17" y="36" width="5.5" height="12" rx="2.7" fill="#f2a24a"/></g>
    <ellipse cx="33" cy="30" rx="18" ry="11.5" fill="#f2a24a"/>
    <path d="M29 19.5 q2 6 0 10 M36 19 q2 6 0 10 M43 21 q1.5 5 0 8" stroke="#d27c28" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M23 35 q9 6 19 1" stroke="#ffdcae" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g class="cat-head">
      <path d="M7 15 L6 2 L16 9Z M18 9 L27 3 L25 16Z" fill="#f2a24a"/>
      <path d="M8.5 11 L8 5.5 L13 9Z M20 9 L25 6 L24 12Z" fill="#ffc4b0"/>
      <circle cx="16" cy="20" r="12" fill="#f2a24a"/>
      <path d="M12 9.5 v4 M16 8.5 v4.5 M20 9.5 v4" stroke="#d27c28" stroke-width="2" stroke-linecap="round"/>
      <g class="eyes-open"><ellipse cx="11" cy="19" rx="2.2" ry="2.8" fill="#26402a"/><ellipse cx="21" cy="19" rx="2.2" ry="2.8" fill="#26402a"/><circle cx="10.4" cy="18" r=".8" fill="#fff"/><circle cx="20.4" cy="18" r=".8" fill="#fff"/></g>
      <g class="eyes-closed"><path d="M8.5 19 q2.5 2.5 5 0 M18.5 19 q2.5 2.5 5 0" stroke="#5b3518" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>
      <path d="M14.5 23 h3 l-1.5 2Z" fill="#e46f6f"/>
      <path d="M16 25 q-2 2.5 -4 1 M16 25 q2 2.5 4 1" stroke="#5b3518" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M5 22 l-6 -1 M5 25 l-6 1 M27 22 l6 -1 M27 25 l6 1" stroke="#fff" stroke-width="1"/>
      <g class="cat-hat"><ellipse cx="16" cy="9.5" rx="15" ry="3" fill="#e0b24e"/><path d="M8 9 Q9 0 16 0 Q23 0 24 9Z" fill="#edc768"/><rect x="8.5" y="6" width="15" height="2.4" fill="#e2574c"/></g>
    </g>
    <g class="cat-bow"><path d="M18 32 l-7 -4 v8Z M18 32 l7 -4 v8Z" fill="#e2574c"/><circle cx="18" cy="32" r="2.2" fill="#b83a30"/></g>
    <g class="cat-bell"><circle cx="18" cy="37" r="3.2" fill="#ffc83d" stroke="#c98a10" stroke-width="1"/><circle cx="18" cy="38" r=".9" fill="#7a5208"/></g>
  </svg>`;

  const TOP = 36;     // مكان القطة في الشريط الخلفي من الأرضية
  let root, home;
  let x = 140;
  let timer = 0, walkTimer = 0;
  let busy = false;   // أثناء الأكل أو اللعب
  let throwsLeft = 0;
  let throwing = false;
  let catcher = null;

  const st = () => Game.state.cat;
  const name = () => st().name || DATA.CAT.DEFAULT_NAME;
  const locked = () => UI.el.app.classList.contains('locked');

  function zone() {
    const w = home.clientWidth;
    return { min: 86, max: Math.max(120, w - 74) };
  }

  function pose(p) {
    root.classList.remove('pose-walk', 'pose-sit', 'pose-sleep', 'pose-lick', 'pose-happy', 'pose-eat');
    root.classList.add(`pose-${p}`);
  }

  function walkTo(target, speed, done) {
    const z = zone();
    target = Math.min(z.max, Math.max(z.min, target));
    const ms = Math.max(120, (Math.abs(target - x) / speed) * 1000);
    root.classList.toggle('face-right', target > x);
    pose('walk');
    root.style.transition = `transform ${ms}ms linear`;
    root.style.transform = `translateX(${target}px)`;
    x = target;
    clearTimeout(walkTimer);
    walkTimer = setTimeout(() => { pose('sit'); if (done) done(); }, ms);
    return ms;
  }

  /* ---------- حياة القطة اليومية ---------- */

  function live() {
    clearTimeout(timer);
    let wait = 5000 + Math.random() * 5000;
    if (!busy && !document.hidden) {
      if (locked()) {
        pose('sleep');
        wait = 10000;
      } else {
        const z = zone();
        const r = Math.random();
        if (r < .5) walkTo(z.min + Math.random() * (z.max - z.min), 42);
        else if (r < .7) pose('lick');
        else if (r < .85) pose('sit');
        else { pose('sleep'); wait = 9000; }
      }
    }
    timer = setTimeout(live, wait);
  }

  function hearts(n = 1) {
    const r = root.getBoundingClientRect();
    for (let k = 0; k < n; k++) setTimeout(() => UI.floatText('❤️', r), k * 180);
  }

  // قلب جديد بعد كل نشاط، مع مكافأة ثابتة عند المحطات
  function reward() {
    const r = Game.catHeart();
    if (r.milestone) {
      const m = r.milestone;
      applyItems();
      UI.showModal(`
        <div class="hero">${m.icon}</div>
        <h2>${UI.escapeHtml(name())} بتحبك كثير!</h2>
        <p>وصلتوا ${m.hearts} ${m.hearts <= 10 ? 'قلوب' : 'قلب'}، وأخذت ${m.name}</p>
        <div class="row"><button class="btn green big" id="catGiftOk">رائع! 🎉</button></div>`);
      document.getElementById('catGiftOk').onclick = UI.closeModal;
      UI.confetti();
    } else if (!r.gained) {
      UI.toast(`${name()} مبسوطة كثير 💚`);
    }
  }

  function applyItems() {
    const has = Game.catItems().map(m => m.item);
    ['bow', 'bell', 'hat'].forEach(i => root.classList.toggle(`has-${i}`, has.includes(i)));
  }

  /* ---------- التفاعل ---------- */

  function onTap() {
    if (busy || locked()) return;
    if (!st().name) askName();
    else openMenu();
  }

  function askName() {
    UI.showModal(`
      <div class="hero">🐈</div>
      <h2>قطة جديدة على سطحك!</h2>
      <p>شو بدك تسميها؟</p>
      <input id="catNameInput" type="text" maxlength="${DATA.CAT.MAX_NAME}" placeholder="مثلاً: ${DATA.CAT.DEFAULT_NAME}" autocomplete="off">
      <div class="row"><button class="btn green big" id="catNameOk">هاد اسمها 💚</button></div>`);
    const input = document.getElementById('catNameInput');
    const done = () => { Game.setCatName(input.value); UI.closeModal(); openMenu(); };
    document.getElementById('catNameOk').onclick = done;
    input.onkeydown = e => { if (e.key === 'Enter') done(); };
    setTimeout(() => input.focus(), 250);
  }

  function openMenu() {
    const next = DATA.CAT.MILESTONES.find(m => m.hearts > st().hearts);
    UI.showModal(`
      <div class="cat-menu-sprite">${SPRITE}</div>
      <h2>${UI.escapeHtml(name())}</h2>
      <p>❤️ ${st().hearts}${next ? ` · عند ${next.hearts} بتاخد ${next.icon}` : ''}</p>
      <div class="cat-actions">
        <button class="btn green big" id="catPet">🤚 دلّلها</button>
        <button class="btn gold big" id="catFeed">🐟 أطعمها</button>
        <button class="btn big" id="catPlay">🧶 العب معها</button>
        <button class="btn big" id="catLater">لاحقاً</button>
      </div>`);
    const menu = document.querySelector('.cat-menu-sprite');
    Game.catItems().forEach(m => menu.classList.add(`has-${m.item}`));
    document.getElementById('catPet').onclick = () => { UI.closeModal(); pet(); };
    document.getElementById('catFeed').onclick = () => { UI.closeModal(); feed(); };
    document.getElementById('catPlay').onclick = () => { UI.closeModal(); startPlay(); };
    document.getElementById('catLater').onclick = UI.closeModal;
  }

  function pet() {
    pose('happy');
    hearts(3);
    reward();
    busy = true;
    setTimeout(() => { busy = false; pose('sit'); }, 1800);
  }

  function feed() {
    busy = true;
    const z = zone();
    const bowlX = Math.min(z.max, Math.max(z.min, x + 60 > z.max ? x - 60 : x + 60));
    const bowl = document.createElement('div');
    bowl.className = 'cat-bowl';
    bowl.textContent = '🐟';
    bowl.style.left = `${bowlX}px`;
    bowl.style.top = `${TOP + 26}px`;
    home.appendChild(bowl);
    walkTo(bowlX + (bowlX > x ? -30 : 30), 70, () => {
      root.classList.toggle('face-right', bowlX > x);
      pose('eat');
      setTimeout(() => {
        bowl.remove();
        pose('happy');
        hearts(2);
        reward();
        setTimeout(() => { busy = false; pose('sit'); }, 900);
      }, 2200);
    });
  }

  /* ---------- اللعب بالكرة ---------- */

  function startPlay() {
    busy = true;
    throwsLeft = DATA.CAT.THROWS;
    throwing = false;
    catcher.hidden = false;
    UI.setMode({ type: 'catPlay' });
  }

  // تُستدعى عند انتهاء اللعب أو إلغائه أو قفل اللعبة
  function stopPlay() {
    if (!catcher || catcher.hidden) return;
    catcher.hidden = true;
    throwsLeft = 0;
    busy = false;
    pose('sit');
  }

  function onThrow(e) {
    if (throwing || throwsLeft <= 0) return;
    throwing = true;
    throwsLeft--;
    UI.updateModeBanner();
    const box = home.getBoundingClientRect();
    const z = zone();
    const tx = Math.min(z.max, Math.max(z.min, e.clientX - box.left));
    const ball = document.createElement('div');
    ball.className = 'cat-ball';
    ball.textContent = '🧶';
    ball.style.top = `${TOP + 24}px`;
    home.appendChild(ball);
    ball.animate([
      { transform: `translateX(${x + 20}px) translateY(0)` },
      { transform: `translateX(${(x + 20 + tx) / 2}px) translateY(-60px)`, offset: .5 },
      { transform: `translateX(${tx}px) translateY(0)` },
    ], { duration: 550, easing: 'ease-out', fill: 'forwards' });
    walkTo(tx, 210, () => {
      pose('happy');
      setTimeout(() => {
        ball.remove();
        throwing = false;
        if (catcher.hidden || throwsLeft > 0) return; // أُلغي اللعب أو باقي رميات
        hearts(3);
        UI.setMode({ type: 'none' });
        reward();
      }, 500);
    });
  }

  function init() {
    home = document.querySelector('.floor-area');
    root = document.createElement('button');
    root.className = 'cat pose-sit';
    root.setAttribute('aria-label', 'قطة السطح');
    root.innerHTML = SPRITE;
    root.style.top = `${TOP}px`;
    root.style.transform = `translateX(${x}px)`;
    root.onclick = onTap;
    home.appendChild(root);

    catcher = document.createElement('div');
    catcher.className = 'cat-catcher';
    catcher.hidden = true;
    catcher.addEventListener('click', onThrow);
    UI.el.scene.appendChild(catcher);

    applyItems();
    timer = setTimeout(live, 2500);
  }

  return {
    init, stopPlay,
    get throwsLeft() { return throwsLeft; },
  };
})();
