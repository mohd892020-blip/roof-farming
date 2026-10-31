'use strict';
/* =========================================================
   kitchen.js — مطبخ السطح: يحوّل الطفل محصوله إلى منتجات بيديه.
   الخطوات: وضع المكونات ← تحريك أو هرس أو عصر ← المنتج جاهز.
   لا يوجد وقت ضاغط، والمكونات تُخصم فقط عند انتهاء الطبخ.
   ========================================================= */

const Kitchen = (() => {
  const $ = id => document.getElementById(id);
  let isOpen = false;
  let job = null; // { recipe, step: add | act | done, left: [plantId], taps }

  function show() {
    isOpen = true;
    job = null;
    const o = $('kitchenOverlay');
    o.style.top = `${document.querySelector('.hud').offsetHeight}px`;
    o.hidden = false;
    renderList();
    $('kitchenBody').scrollTop = 0;
  }

  function close() {
    isOpen = false;
    job = null;
    const o = $('kitchenOverlay');
    if (o) o.hidden = true;
    if ($('kitchenBody')) $('kitchenBody').innerHTML = '';
  }

  function needsHtml(r) {
    return Object.keys(r.needs).map(id => {
      const have = Game.state.crops[id] || 0;
      const n = r.needs[id];
      return `<span class="need ${have >= n ? 'ok' : ''}"><span class="mini-ic">${UI.Art.icon(DATA.PLANTS[id])}</span>${Math.min(have, n)}/${n}</span>`;
    }).join('');
  }

  function renderList() {
    $('kitchenTitle').textContent = 'مطبخ السطح 🍳';
    const s = Game.state;
    const open = DATA.RECIPE_ORDER.map(id => DATA.RECIPES[id]).filter(Game.recipeUnlocked);
    const next = DATA.RECIPE_ORDER.map(id => DATA.RECIPES[id]).find(r => !Game.recipeUnlocked(r));
    const list = next ? [...open, next] : open;
    $('kitchenBody').innerHTML = `<p class="sheet-note">اطبخ من محصولك، والمنتج بينباع بسعر أعلى 🧺</p>
      <div class="card-list">${list.map(r => {
        const locked = !Game.recipeUnlocked(r);
        const owned = s.products[r.id] || 0;
        return `<div class="item-card ${locked ? 'locked' : ''}">
          <div class="ic emoji">${r.icon}</div>
          <div class="info">
            <h3>${r.name}</h3>
            <div class="needs">${needsHtml(r)}</div>
            <div class="meta"><span>تُباع بـ <i class="coin sm"></i> ${r.price}</span></div>
            ${locked ? `<div class="lock">🔒 تفتح في المستوى ${r.level}</div>` : owned ? `<div class="owned">عندك ${owned}</div>` : ''}
          </div>
          <div class="actions">
            <button class="btn green" data-cook="${r.id}" ${Game.canCook(r) ? '' : 'disabled'}>اطبخ</button>
          </div>
        </div>`;
      }).join('')}</div>`;
  }

  function start(id) {
    const r = DATA.RECIPES[id];
    if (!Game.canCook(r)) return;
    const left = [];
    for (const pid of Object.keys(r.needs)) for (let k = 0; k < r.needs[pid]; k++) left.push(pid);
    job = { recipe: r, step: 'add', left, taps: 0 };
    renderJob();
  }

  function renderJob() {
    const { recipe: r, step, left, taps } = job;
    $('kitchenTitle').textContent = `${r.name} ${r.icon}`;
    const a = DATA.COOK_ACTIONS[r.action];
    let body;
    if (step === 'add') {
      body = `<p class="cook-hint">اضغط على المكونات لتضعها 👇</p>
        <div class="ing-row">${left.map((pid, k) => `<button class="ing" data-ing="${k}" aria-label="${DATA.PLANTS[pid].name}">${UI.Art.icon(DATA.PLANTS[pid])}</button>`).join('')}</div>`;
    } else if (step === 'act') {
      body = `<p class="cook-hint">استمر بالضغط، على مهلك 🌟</p>
        <div class="cook-meter"><span class="meter"><span class="meter-fill xp" style="width:${Math.round((taps / r.taps) * 100)}%"></span></span></div>
        <button class="btn green big cook-act" id="cookAct">${a.icon} ${a.label}!</button>`;
    } else {
      body = `<div class="cook-done">
          <div class="cook-product">${r.icon}</div>
          <h3>صار عندك ${r.name}! 🎉</h3>
          <p>تُباع بـ <i class="coin sm"></i> ${r.price}، أو خذها للبسطة وخذ إكرامية</p>
        </div>
        <div class="row cook-row">
          <button class="btn green big" data-again ${Game.canCook(r) ? '' : 'disabled'}>اطبخ كمان</button>
          <button class="btn big" data-back>رجوع</button>
        </div>`;
    }
    $('kitchenBody').innerHTML = `<div class="cook-stage">
      ${step === 'done' ? '' : `<div class="pot" id="pot">${r.vessel}</div>`}
      ${body}
      ${step === 'done' ? '' : '<button class="btn cook-cancel" data-back>رجوع بدون طبخ</button>'}
    </div>`;
  }

  function addIngredient(btn) {
    const k = Number(btn.dataset.ing);
    const pid = job.left[k];
    UI.fly(UI.Art.icon(DATA.PLANTS[pid]), btn.getBoundingClientRect(), $('pot'), {
      count: 1,
      onArrive: () => { const pot = $('pot'); if (pot) UI.replay(pot, 'wiggle'); },
    });
    job.left.splice(k, 1);
    if (!job.left.length) job.step = 'act';
    renderJob();
  }

  function tapAction() {
    job.taps++;
    if (job.taps < job.recipe.taps) {
      renderJob();
      UI.replay($('pot'), 'wiggle');
      return;
    }
    const r = Game.cook(job.recipe.id);
    if (!r.ok) { job = null; renderList(); return; }
    job.step = 'done';
    renderJob();
    UI.confetti();
    UI.render();
  }

  function onClick(e) {
    const t = e.target.closest('[data-cook],[data-ing],[data-again],[data-back],#cookAct');
    if (!t || t.disabled) return;
    if (t.dataset.cook) start(t.dataset.cook);
    else if (t.dataset.ing != null) addIngredient(t);
    else if (t.id === 'cookAct') tapAction();
    else if (t.hasAttribute('data-again')) start(job.recipe.id);
    else { job = null; renderList(); }
  }

  function init() {
    $('kitchenClose').onclick = close;
    $('kitchenBody').addEventListener('click', onClick);
  }

  return { init, show, close, get isOpen() { return isOpen; } };
})();
