'use strict';
/* =========================================================
   tutorial.js — شرح تفاعلي من 4 خطوات لأول تشغيل:
   ازرع ← اسقِ ← انتظر (30 ثانية هذه المرة فقط) ← احصد وبِع.
   لا يوقف اللعب، بل يوجّه الطفل بسهم ولافتة، ويمكن تخطيه.
   ========================================================= */

const Tutorial = (() => {
  const $ = id => document.getElementById(id);
  const STEPS = {
    plant: { n: 1, text: 'اضغط على حوض فارغ وازرع نعناع 🌱' },
    water: { n: 2, text: 'اضغط على النبتة لتسقيها 💧' },
    wait: { n: 3, text: 'استنى شوي، هالمرة بس بتجهز بـ 30 ثانية ⏳' },
    harvest: { n: 4, text: 'صارت جاهزة! اضغط عليها لتحصدها ✨' },
    sell: { n: 4, text: 'افتح المتجر وبيع محصولك 🏪' },
  };
  let bar, finger;
  let active = false;

  function visible(node) {
    return !!node && node.getClientRects().length > 0;
  }

  // العنصر الذي يشير إليه السهم في الخطوة الحالية
  function target(step, plot) {
    const sheetOpen = !$('sheetOverlay').hidden;
    if (step === 'plant') {
      if (sheetOpen) return document.querySelector('[data-act="plant"][data-id="mint"]');
      return document.querySelector('.plot.empty');
    }
    if (step === 'water' || step === 'harvest') return UI.plotEl(plot);
    if (step === 'sell') {
      if (!sheetOpen) return $('btnShop');
      return document.querySelector('[data-act="sellAll"]') || document.querySelector('[data-act="tab"][data-id="sell"]');
    }
    return null;
  }

  function hide() {
    bar.hidden = true;
    finger.hidden = true;
  }

  function update() {
    if (!bar) return;
    const before = Game.state.tutorial.step;
    const step = Game.tutorialTick();
    active = step !== 'done';
    if (!active) {
      hide();
      if (before !== 'done') finish();
      return;
    }
    if (Game.isFirstRun() || !UI.el.modalOverlay.hidden || UI.el.app.classList.contains('locked')) { hide(); return; }
    const s = STEPS[step];
    bar.hidden = false;
    $('tutorialText').textContent = s.text;
    $('tutorialStep').textContent = `${s.n}/4`;

    const t = target(step, Game.state.tutorial.plot);
    if (!visible(t)) { finger.hidden = true; return; }
    const r = t.getBoundingClientRect();
    const p = UI.fxPoint({ left: r.left, top: r.top, width: r.width, height: 0 });
    finger.hidden = false;
    finger.style.transform = `translate(${p.x - 20}px, ${Math.max(0, p.y - 38)}px)`;
  }

  function finish() {
    Sound.play('level');
    UI.showModal(`
      <div class="hero">🎉</div>
      <h2>صرت مزارع سطح!</h2>
      <p>ازرع، اسقِ، احصد، وبيع. وسطحك بيكبر معك 🌱</p>
      <div class="row"><button class="btn green big" id="tutDone">يلّا 🌿</button></div>`);
    UI.confetti();
    $('tutDone').onclick = () => { UI.closeModal(); parentNote(); };
  }

  // رسالة للأهل بعد الشرح: ضبط الإعدادات أو تخطيها
  function parentNote() {
    UI.showModal(`
      <div class="hero">👨‍👩‍👧</div>
      <h2>رسالة للأهل</h2>
      <p>تقدرون تضبطون وقت اللعب اليومي ووضع النوم من منطقة الأهل ⚙️</p>
      <div class="row">
        <button class="btn green big" id="noteSet">الإعدادات</button>
        <button class="btn big" id="noteSkip">تخطي</button>
      </div>`);
    $('noteSkip').onclick = UI.closeModal;
    $('noteSet').onclick = () => { UI.closeModal(); Parent.open(); };
  }

  function skip() {
    Game.skipTutorial();
    active = false;
    hide();
    parentNote();
  }

  function init() {
    bar = $('tutorialBar');
    finger = $('tutorialFinger');
    $('tutorialSkip').onclick = skip;
    update();
  }

  return { init, update, get active() { return active; } };
})();
