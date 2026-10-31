'use strict';
/* =========================================================
   stall.js — بسطة الحارة: زبون يطلب صنفاً من مخزنك، وتعطيه الصنف الصح.
   الزبون ينتظر على راحته، والخطأ لا يكلّف شيئاً.
   ========================================================= */

const Stall = (() => {
  const $ = id => document.getElementById(id);
  let isOpen = false;
  let customer = null; // { face, kind, id, name }
  let lastItem = '';
  let served = 0;
  let busy = false;

  const iconOf = g => (g.kind === 'crop' ? UI.Art.icon(DATA.PLANTS[g.id]) : DATA.RECIPES[g.id].icon);

  function show() {
    isOpen = true;
    served = 0;
    busy = false;
    const o = $('stallOverlay');
    o.style.top = `${document.querySelector('.hud').offsetHeight}px`;
    o.hidden = false;
    nextCustomer();
  }

  function close() {
    isOpen = false;
    customer = null;
    const o = $('stallOverlay');
    if (o) o.hidden = true;
    if ($('stallBody')) $('stallBody').innerHTML = '';
  }

  function nextCustomer() {
    const goods = Game.goods();
    if (!goods.length) { customer = null; renderEmpty(); return; }
    // لا نكرر الصنف نفسه مرتين متتاليتين إذا توفر غيره
    const pool = goods.length > 1 ? goods.filter(g => `${g.kind}:${g.id}` !== lastItem) : goods;
    const g = pool[Math.floor(Math.random() * pool.length)];
    const faces = DATA.STALL.CUSTOMERS;
    const others = faces.filter(f => !customer || f !== customer.face);
    customer = { face: others[Math.floor(Math.random() * others.length)], kind: g.kind, id: g.id, name: g.name };
    lastItem = `${g.kind}:${g.id}`;
    renderCustomer();
  }

  function renderEmpty() {
    $('stallBody').innerHTML = `<div class="stall-empty">
      <div class="stall-awning"></div>
      <span class="big-emoji">🧺</span>
      <h3>${served ? 'بعت كل شي! 🎉' : 'البسطة فاضية'}</h3>
      <p>احصد نباتاتك أو اطبخ، وارجع افتح البسطة</p>
    </div>`;
  }

  function renderCustomer() {
    const goods = Game.goods();
    const want = goods.find(g => g.kind === customer.kind && g.id === customer.id);
    $('stallBody').innerHTML = `
      <div class="stall-street">
        <div class="stall-awning"></div>
        <div class="customer" id="customer">
          <div class="customer-face">${customer.face}</div>
          <div class="speech" id="speech">
            <span class="speech-ic">${iconOf(want)}</span>
            <span>بدي ${customer.name}</span>
          </div>
        </div>
      </div>
      <div class="stall-counter">
        <p class="stall-tip">الزبون بيدفع السعر وإكرامية: <i class="coin sm"></i> ${Game.stallPrice(want)}</p>
        <div class="shelf">${goods.map(g => `<button class="shelf-item" data-kind="${g.kind}" data-id="${g.id}" aria-label="${g.name}">
          <span class="shelf-ic">${iconOf(g)}</span>
          <span class="shelf-name">${g.name}</span>
          <span class="shelf-count">× ${g.count}</span>
        </button>`).join('')}</div>
      </div>`;
  }

  function onClick(e) {
    const t = e.target.closest('.shelf-item');
    if (!t || busy || !customer) return;
    if (t.dataset.kind !== customer.kind || t.dataset.id !== customer.id) {
      // خطأ بسيط بلا أي خسارة
      Sound.play('soft');
      UI.replay($('speech'), 'shake');
      UI.toast('مش هاي، جرّب غيرها 😊', 1500);
      return;
    }
    const from = t.getBoundingClientRect();
    const r = Game.stallSell(customer.kind, customer.id);
    if (!r.ok) return;
    busy = true;
    served++;
    UI.coinFx(from, r.coins);
    $('speech').innerHTML = '<span>شكراً! 💚</span>';
    $('customer').classList.add('leaving');
    setTimeout(() => {
      busy = false;
      if (isOpen) nextCustomer();
    }, 800);
  }

  function init() {
    $('stallClose').onclick = close;
    $('stallBody').addEventListener('click', onClick);
  }

  return { init, show, close, get isOpen() { return isOpen; } };
})();
