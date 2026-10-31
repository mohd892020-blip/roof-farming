'use strict';
/* =========================================================
   parent.js — منطقة الأهل
   قفل بسؤال ضرب أو رمز PIN، مدة اللعب اليومية، وضع النوم، أوقات المدرسة،
   الأصوات، التقرير الأسبوعي، تصدير/استيراد الحفظ وإعادة الضبط.
   وقت اللعب يُحسب فقط عندما تكون اللعبة ظاهرة على الشاشة.
   ========================================================= */

const Parent = (() => {
  const $ = id => document.getElementById(id);
  const P = () => Game.state.parent;
  let panelOpen = false;
  let lastTrack = 0;

  /* ---------- الوقت والأيام ---------- */

  function dateKey(t) {
    const d = new Date(t);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  // هل الوقت داخل نافذة (تدعم النوافذ التي تعبر منتصف الليل مثل 20:00 ← 06:00)
  function inWindow(t, start, end) {
    const d = new Date(t);
    const m = d.getHours() * 60 + d.getMinutes();
    const s = toMin(start), e = toMin(end);
    if (s === e) return false;
    return s < e ? m >= s && m < e : m >= s || m < e;
  }

  /* ---------- وقت اللعب ---------- */

  function usedTodayMs(now = Date.now()) { return Game.state.playLog[dateKey(now)] || 0; }

  function limitMs(now = Date.now()) {
    const p = P();
    if (!p.limitMin) return Infinity;
    const extra = p.extraDay === dateKey(now) ? p.extraMin : 0;
    return (p.limitMin + extra) * DATA.MIN;
  }

  function remainingMs(now = Date.now()) { return limitMs(now) - usedTodayMs(now); }

  // يُستدعى كل ثانية: نضيف الوقت فقط إذا كانت اللعبة ظاهرة وغير مقفلة
  function track(now, locked) {
    const visible = document.visibilityState === 'visible';
    if (!visible || locked || !lastTrack) { lastTrack = visible && !locked ? now : 0; return; }
    const delta = Math.min(Math.max(0, now - lastTrack), 3000);
    lastTrack = now;
    const key = dateKey(now);
    const log = Game.state.playLog;
    log[key] = Math.round((log[key] || 0) + delta);
    // نحذف الأيام القديمة
    const keys = Object.keys(log).sort();
    while (keys.length > DATA.PLAYLOG_DAYS) delete log[keys.shift()];
  }

  // تنبيه لطيف قبل انتهاء الوقت بدقيقتين (مرة واحدة في اليوم)
  function shouldWarn(now) {
    const p = P();
    if (!p.warn || !p.limitMin) return false;
    const left = remainingMs(now);
    if (left > DATA.LIMIT_WARN_MS || left <= 0 || p.warnedDay === dateKey(now)) return false;
    p.warnedDay = dateKey(now);
    Game.save();
    return true;
  }

  /* ---------- الأقفال: النوم، المدرسة، انتهاء الوقت ---------- */

  function lockReason(now = Date.now()) {
    const p = P();
    if (p.sleepOn && inWindow(now, p.sleepStart, p.sleepEnd)) return 'sleep';
    if (p.schoolOn && p.schoolDays.includes(new Date(now).getDay()) && inWindow(now, p.schoolStart, p.schoolEnd)) return 'school';
    if (remainingMs(now) <= 0) return 'limit';
    return null;
  }

  function lockText(reason) {
    const p = P();
    if (reason === 'sleep') {
      return { hero: '🌙', title: 'السطح نايم', text: `النباتات بتكبر وهي نايمة 🌱💤<br>نلتقي الصبح الساعة ${p.sleepEnd}` };
    }
    if (reason === 'school') {
      return { hero: '📚', title: 'وقت المدرسة', text: `سطحك بيستناك بعد الساعة ${p.schoolEnd} 🌱<br>والنباتات بتكمل نموها` };
    }
    return { hero: '👋', title: 'خلص وقت اللعب لليوم', text: 'سطحك محفوظ، والنباتات بتكمل نموها 🌱<br>نلتقي بكرة! 💚' };
  }

  /* ---------- قفل منطقة الأهل ---------- */

  function hashPin(pin) {
    let h = 7;
    for (const ch of `sathi:${pin}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `h${h.toString(36)}`;
  }

  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // لوحة أرقام كبيرة: تستخدم لسؤال الضرب ولرمز PIN
  function keypad({ hero, title, prompt, maxLen, secret, onSubmit, extra }) {
    let value = '';
    UI.showModal(`
      <div class="hero">${hero}</div>
      <h2>${title}</h2>
      <p class="gate-q">${prompt}</p>
      <div class="pin-display" id="pinDisplay"></div>
      <div class="keypad" id="keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join('')}
        <button class="key soft" data-k="del" aria-label="مسح">⌫</button>
        <button class="key" data-k="0">0</button>
        <button class="key ok" data-k="ok" aria-label="تأكيد">✓</button>
      </div>
      <div class="row">${extra || ''}<button class="btn big" id="gateCancel">إلغاء</button></div>`);
    const display = $('pinDisplay');
    const draw = () => {
      display.textContent = secret ? '●'.repeat(value.length) + '○'.repeat(Math.max(0, maxLen - value.length)) : (value || '؟');
    };
    draw();
    $('gateCancel').onclick = () => UI.closeModal();
    $('keypad').onclick = e => {
      const k = e.target.closest('[data-k]');
      if (!k) return;
      const key = k.dataset.k;
      if (key === 'del') value = value.slice(0, -1);
      else if (key === 'ok') { if (value) onSubmit(value, wrong); return; }
      else if (value.length < maxLen) value += key;
      draw();
      if (secret && value.length === maxLen) onSubmit(value, wrong);
    };
    function wrong() {
      value = '';
      draw();
      UI.replay(display, 'shake');
    }
  }

  function mathGate(onPass, hard) {
    const a = hard ? rand(12, 19) : rand(6, 9);
    const b = rand(6, 9);
    let tries = 0;
    keypad({
      hero: '🔐', title: 'للأهل فقط', prompt: `كم يساوي <b dir="ltr">${a} × ${b}</b> ؟`, maxLen: 3, secret: false,
      onSubmit: (v, wrong) => {
        if (Number(v) === a * b) { UI.closeModal(); onPass(); return; }
        wrong();
        if (++tries >= 2) mathGate(onPass, hard); // سؤال جديد بعد محاولتين
      },
    });
  }

  function pinGate(onPass) {
    keypad({
      hero: '🔐', title: 'رمز الأهل', prompt: 'أدخل الرمز المكوّن من 4 أرقام', maxLen: 4, secret: true,
      extra: '<button class="btn big" id="forgotPin">نسيت الرمز</button>',
      onSubmit: (v, wrong) => {
        if (hashPin(v) === P().pin) { UI.closeModal(); onPass(); } else wrong();
      },
    });
    // نسيان الرمز: سؤال ضرب أصعب
    $('forgotPin').onclick = () => mathGate(onPass, true);
  }

  function gate(onPass) {
    if (P().pin) pinGate(onPass);
    else mathGate(onPass, false);
  }

  function setPinFlow() {
    keypad({
      hero: '🔢', title: 'رمز جديد', prompt: 'اختر رمزاً من 4 أرقام', maxLen: 4, secret: true,
      onSubmit: first => {
        keypad({
          hero: '🔢', title: 'أكّد الرمز', prompt: 'أدخل الرمز مرة ثانية', maxLen: 4, secret: true,
          onSubmit: (second, wrong) => {
            if (second !== first) { wrong(); UI.toast('الرمزان غير متطابقين، جرّب مرة ثانية'); return; }
            P().pin = hashPin(first);
            Game.save();
            UI.closeModal();
            renderPanel();
            UI.toast('تم حفظ رمز الأهل 🔐');
          },
        });
      },
    });
  }

  /* ---------- لوحة الأهل ---------- */

  function open() {
    gate(() => {
      panelOpen = true;
      $('parentOverlay').hidden = false;
      renderPanel();
      $('parentBody').scrollTop = 0;
    });
  }

  function close() {
    panelOpen = false;
    $('parentOverlay').hidden = true;
    $('parentBody').innerHTML = '';
    UI.refreshLock();
  }

  const timeOptions = sel => {
    let o = '';
    for (let m = 0; m < 24 * 60; m += 30) {
      const v = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      o += `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}</option>`;
    }
    return o;
  };
  const toggle = (key, on, label) =>
    `<label class="switch-row"><span>${label}</span><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><i class="switch"></i></label>`;
  const fmtMin = ms => Math.round(ms / DATA.MIN);

  function renderPanel() {
    if (!panelOpen) return;
    const p = P();
    const now = Date.now();
    const used = fmtMin(usedTodayMs(now));
    const extraToday = p.extraDay === dateKey(now) ? p.extraMin : 0;

    $('parentBody').innerHTML = `
      <section class="p-card">
        <h3>⏱️ وقت اللعب اليومي</h3>
        <p class="p-note">لعب اليوم: <b>${used}</b> دقيقة${p.limitMin ? ` من ${p.limitMin + extraToday}` : ''}</p>
        <div class="chips">
          ${DATA.LIMIT_OPTIONS.map(n => `<button class="chip ${p.limitMin === n ? 'on' : ''}" data-limit="${n}">${n ? `${n} د` : 'إيقاف'}</button>`).join('')}
        </div>
        ${toggle('warn', p.warn, 'تنبيه قبل النهاية بدقيقتين')}
        ${p.limitMin ? `<button class="btn" data-act="extra">+${DATA.LIMIT_EXTRA_MIN} دقائق لليوم فقط</button>` : ''}
      </section>

      <section class="p-card">
        <h3>🌙 وضع النوم</h3>
        ${toggle('sleepOn', p.sleepOn, 'السطح ينام ليلاً')}
        <div class="time-row ${p.sleepOn ? '' : 'off'}">
          <label>من <select data-time="sleepStart">${timeOptions(p.sleepStart)}</select></label>
          <label>إلى <select data-time="sleepEnd">${timeOptions(p.sleepEnd)}</select></label>
        </div>
      </section>

      <section class="p-card">
        <h3>📚 أوقات المدرسة</h3>
        ${toggle('schoolOn', p.schoolOn, 'منع اللعب وقت المدرسة')}
        <div class="${p.schoolOn ? '' : 'off'}">
          <div class="chips days">
            ${DATA.WEEKDAYS.map((d, i) => `<button class="chip ${p.schoolDays.includes(i) ? 'on' : ''}" data-day="${i}">${d}</button>`).join('')}
          </div>
          <div class="time-row">
            <label>من <select data-time="schoolStart">${timeOptions(p.schoolStart)}</select></label>
            <label>إلى <select data-time="schoolEnd">${timeOptions(p.schoolEnd)}</select></label>
          </div>
        </div>
      </section>

      <section class="p-card">
        <h3>🔔 الأصوات والإشعارات</h3>
        ${toggle('sound', p.sound, 'الأصوات')}
        ${toggle('music', p.music, 'موسيقى هادئة')}
        ${toggle('notifications', p.notifications, 'إشعار إيجابي واحد يومياً (في التطبيق)')}
      </section>

      <section class="p-card">
        <h3>🌍 تحدي الأسبوع</h3>
        ${challengeHtml()}
      </section>

      <section class="p-card">
        <h3>📊 التقرير الأسبوعي</h3>
        ${weeklyChart(now)}
      </section>

      <section class="p-card">
        <h3>🔐 رمز الأهل</h3>
        <p class="p-note">${p.pin ? 'منطقة الأهل محمية برمز من 4 أرقام.' : 'حالياً تُفتح منطقة الأهل بسؤال ضرب. يمكنك تعيين رمز بدلاً منه.'}</p>
        <div class="btn-pair">
          <button class="btn" data-act="setPin">${p.pin ? 'تغيير الرمز' : 'تعيين رمز'}</button>
          ${p.pin ? '<button class="btn" data-act="removePin">إلغاء الرمز</button>' : ''}
        </div>
      </section>

      <section class="p-card">
        <h3>💾 الحفظ</h3>
        <div class="btn-pair">
          <button class="btn" data-act="export">⬇️ تصدير ملف</button>
          <button class="btn" data-act="import">⬆️ استيراد ملف</button>
        </div>
        <button class="btn danger" data-act="reset">إعادة ضبط اللعبة</button>
      </section>`;
  }

  // تحدي اختياري من الواقع: الأهل يؤكدونه والطفل يأخذ قطعة زينة خاصة
  function challengeHtml() {
    const ch = Game.currentChallenge();
    if (!ch) return '<p class="p-note">لا يوجد تحدي جديد هذا الأسبوع 🌱</p>';
    const prize = DATA.DECOR[ch.decor];
    return `<p class="p-note">${ch.text}. الجائزة: ${prize.name} ${prize.icon}</p>
      <button class="btn" data-act="challengeDone">أكّد إتمام التحدي ✅</button>`;
  }

  /* ---------- التقرير الأسبوعي: دقائق اللعب لآخر 7 أيام ---------- */

  function weeklyChart(now) {
    const days = [];
    for (let k = 6; k >= 0; k--) {
      const t = now - k * DATA.DAY;
      days.push({ key: dateKey(t), name: DATA.WEEKDAYS[new Date(t).getDay()], min: fmtMin(Game.state.playLog[dateKey(t)] || 0), today: k === 0 });
    }
    const limit = P().limitMin;
    const top = Math.max(10, limit, ...days.map(d => d.min));
    const total = days.reduce((a, d) => a + d.min, 0);
    const maxDay = days.reduce((a, d) => (d.min > a.min ? d : a), days[0]);
    const bars = days.map(d => {
      const h = (d.min / top) * 100;
      const label = d.today || (d === maxDay && d.min > 0) ? `<span class="bar-val">${d.min}</span>` : '';
      return `<button class="bar-col ${d.today ? 'today' : ''}" data-tip="${d.name}: ${d.min} دقيقة" aria-label="${d.name}: ${d.min} دقيقة">
        <span class="bar-track"><span class="bar" style="height:${h}%">${label}</span></span>
        <span class="bar-day">${d.today ? 'اليوم' : d.name}</span>
      </button>`;
    }).join('');
    // الخط يبدأ فوق مساحة أسماء الأيام (24px) ويتجاهل مساحة الأرقام العلوية (18px) مثل الأعمدة
    const limitLine = limit ? `<span class="limit-line" style="bottom:calc(24px + ${(limit / top).toFixed(3)} * (100% - 42px))"><em>الحد ${limit} د</em></span>` : '';
    return `<div class="week-hero"><b>${total}</b> دقيقة هذا الأسبوع · المعدل <b>${Math.round(total / 7)}</b> دقيقة يومياً</div>
      <div class="week-chart">${limitLine}${bars}</div>
      <div class="bar-tip" id="barTip">اضغط على أي يوم لترى دقائقه</div>
      <table class="sr-only"><caption>دقائق اللعب لآخر 7 أيام</caption>
        ${days.map(d => `<tr><th>${d.name}</th><td>${d.min}</td></tr>`).join('')}</table>`;
  }

  /* ---------- الحفظ: تصدير، استيراد، إعادة ضبط ---------- */

  function exportSave() {
    Game.save();
    const blob = new Blob([JSON.stringify(Game.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sathi-alakhdar-${dateKey(Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    UI.toast('تم تصدير ملف الحفظ 💾');
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data = null;
      try { data = SaveStore.migrate(JSON.parse(reader.result), Date.now()); } catch (e) { data = null; }
      if (!data || !Array.isArray(data.plots)) { UI.toast('هذا الملف ليس ملف حفظ صالحاً'); return; }
      confirmBox({
        hero: '⬆️', title: 'استيراد الحفظ؟', text: `سيُستبدل السطح الحالي بـ "${UI.escapeHtml(data.roofName || DATA.DEFAULT_ROOF_NAME)}"`,
        yes: 'استيراد', danger: false,
        onYes: () => replaceSave(data),
      });
    };
    reader.readAsText(file);
  }

  function replaceSave(data) {
    Game.stopSaving();
    SaveStore.save(data);
    location.reload();
  }

  // إعادة الضبط بتأكيد مزدوج. إعدادات الأهل وسجل الوقت تبقى كما هي
  function resetGame() {
    confirmBox({
      hero: '⚠️', title: 'إعادة ضبط اللعبة؟', text: 'سيُحذف السطح والعملات والنباتات والمستويات. إعدادات الأهل تبقى.',
      yes: 'متابعة', danger: true,
      onYes: () => confirmBox({
        hero: '🗑️', title: 'تأكيد أخير', text: 'لا يمكن التراجع عن هذا. هل أنت متأكد؟',
        yes: 'نعم، ابدأ من جديد', danger: true,
        onYes: () => {
          const fresh = SaveStore.fresh(Date.now());
          fresh.parent = Game.state.parent;
          fresh.playLog = Game.state.playLog;
          replaceSave(fresh);
        },
      }),
    });
  }

  function confirmBox({ hero, title, text, yes, danger, onYes }) {
    UI.showModal(`
      <div class="hero">${hero}</div>
      <h2>${title}</h2>
      <p>${text}</p>
      <div class="row">
        <button class="btn big ${danger ? 'danger' : 'green'}" id="cfYes">${yes}</button>
        <button class="btn big" id="cfNo">إلغاء</button>
      </div>`);
    $('cfNo').onclick = () => UI.closeModal();
    $('cfYes').onclick = () => { UI.closeModal(); onYes(); };
  }

  /* ---------- أحداث اللوحة ---------- */

  function onPanelClick(e) {
    const p = P();
    const t = e.target.closest('[data-limit],[data-day],[data-act],[data-tip]');
    if (!t) return;
    if (t.dataset.limit != null) {
      p.limitMin = Number(t.dataset.limit);
    } else if (t.dataset.day != null) {
      const d = Number(t.dataset.day);
      p.schoolDays = p.schoolDays.includes(d) ? p.schoolDays.filter(x => x !== d) : [...p.schoolDays, d].sort();
    } else if (t.dataset.tip) {
      $('barTip').textContent = t.dataset.tip;
      return;
    } else {
      switch (t.dataset.act) {
        case 'extra': {
          const today = dateKey(Date.now());
          p.extraMin = (p.extraDay === today ? p.extraMin : 0) + DATA.LIMIT_EXTRA_MIN;
          p.extraDay = today;
          p.warnedDay = '';
          UI.toast(`أضفت ${DATA.LIMIT_EXTRA_MIN} دقائق لليوم ⏱️`);
          break;
        }
        case 'challengeDone': {
          const r = Game.completeChallenge();
          if (r.ok) {
            Sound.play('gift');
            UI.toast(`صارت ${r.decor.name} على السطح ${r.decor.icon}`);
          }
          break;
        }
        case 'setPin': setPinFlow(); return;
        case 'removePin':
          p.pin = '';
          UI.toast('صار القفل بسؤال الضرب');
          break;
        case 'export': exportSave(); return;
        case 'import': $('importFile').click(); return;
        case 'reset': resetGame(); return;
        default: return;
      }
    }
    Game.save();
    renderPanel();
  }

  function onPanelChange(e) {
    const p = P();
    const t = e.target;
    if (t.dataset.set) p[t.dataset.set] = t.checked;
    else if (t.dataset.time) p[t.dataset.time] = t.value;
    else return;
    Game.save();
    Sound.sync();
    renderPanel();
  }

  function init() {
    $('gearBtn').onclick = open;
    $('parentClose').onclick = close;
    $('parentBody').addEventListener('click', onPanelClick);
    $('parentBody').addEventListener('change', onPanelChange);
    $('importFile').addEventListener('change', e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) importSave(f);
    });
    document.addEventListener('visibilitychange', () => { lastTrack = 0; });
  }

  return {
    init, open, close, track, lockReason, lockText, shouldWarn, remainingMs, usedTodayMs, dateKey,
    get panelOpen() { return panelOpen; },
  };
})();
