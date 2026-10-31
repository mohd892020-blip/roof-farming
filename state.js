'use strict';
/* =========================================================
   state.js — الحفظ والتحميل وترقية بيانات الحفظ القديمة
   كل البيانات تحت مفتاح واحد: rooftop_save_v1
   ========================================================= */

const SaveStore = (() => {
  function freshPlot(i) {
    return { id: i, tier: 'wood', sprinkler: false, net: false, umbrella: false, crop: null };
  }

  function fresh(now) {
    const plots = [];
    for (let i = 0; i < DATA.START_PLOTS; i++) plots.push(freshPlot(i));
    return {
      version: DATA.SAVE_VERSION,
      createdAt: now,
      lastSeen: now,
      roofName: '',            // فارغ = أول تشغيل (تظهر شاشة الترحيب)
      coins: DATA.START_COINS,
      xp: 0,
      energy: DATA.ENERGY_MAX,
      energyDay: '',           // مفتاح يوم آخر تجديد للطاقة (يبدأ اليوم الساعة 6 صباحاً)
      tools: {},               // أدوات غير مركّبة: { toolId: count }
      scarecrow: false,        // الفزاعة: مكافأة حارس السطح
      seeds: { ...DATA.START_SEEDS },
      crops: {},               // المخزن: { plantId: count }
      plots,
      stats: { harvested: {}, sold: 0, earned: 0, birdsShooed: 0 },
      parent: freshParent(),   // إعدادات الأهل
      playLog: {},             // وقت اللعب الفعلي: { 'YYYY-MM-DD': ms }
      weather: { day: '', type: 'sunny', rained: [] }, // طقس اليوم، والأحواض التي سقاها المطر
      orders: [],              // طلبات الجيران
      pigeon: { lastFedDay: '', visits: 0 },
      login: { days: 0, lastDay: '' },
    };
  }

  function freshParent() {
    const d = DATA.PARENT_DEFAULTS;
    return { ...d, schoolDays: [...d.schoolDays] };
  }

  // يملأ أي حقول ناقصة بقيم افتراضية دون أن يمسح ما هو موجود
  function normalize(d, now) {
    const base = fresh(now);
    const s = { ...base, ...d };
    s.version = DATA.SAVE_VERSION;
    s.coins = safeInt(s.coins, base.coins);
    s.xp = safeInt(s.xp, 0);
    s.lastSeen = Number.isFinite(s.lastSeen) ? s.lastSeen : now;
    s.energy = Math.min(DATA.ENERGY_MAX, safeInt(s.energy, DATA.ENERGY_MAX));
    if (typeof s.energyDay !== 'string') s.energyDay = '';
    s.tools = cleanCounts(s.tools);
    s.scarecrow = !!s.scarecrow;
    s.seeds = cleanCounts(s.seeds);
    s.crops = cleanCounts(s.crops);
    s.stats = { ...base.stats, ...(s.stats || {}) };
    if (typeof s.roofName !== 'string') s.roofName = '';
    s.parent = cleanParent(s.parent);
    s.playLog = cleanCounts(s.playLog);
    const w = s.weather && typeof s.weather === 'object' ? s.weather : {};
    s.weather = {
      day: typeof w.day === 'string' ? w.day : '',
      type: DATA.WEATHER[w.type] ? w.type : 'sunny',
      rained: Array.isArray(w.rained) ? w.rained.filter(Number.isInteger) : [],
    };
    s.orders = (Array.isArray(s.orders) ? s.orders : [])
      .filter(o => o && DATA.PLANTS[o.plantId] && Number.isInteger(o.who) && DATA.ORDERS.NEIGHBORS[o.who])
      .slice(0, DATA.ORDERS.SLOTS)
      .map(o => ({ who: o.who, plantId: o.plantId, qty: Math.max(1, safeInt(o.qty, 1)), done: !!o.done }));
    s.pigeon = { lastFedDay: (s.pigeon && typeof s.pigeon.lastFedDay === 'string') ? s.pigeon.lastFedDay : '', visits: safeInt(s.pigeon && s.pigeon.visits, 0) };
    s.login = { days: safeInt(s.login && s.login.days, 0), lastDay: (s.login && typeof s.login.lastDay === 'string') ? s.login.lastDay : '' };

    if (!Array.isArray(s.plots) || s.plots.length === 0) s.plots = base.plots;
    s.plots = s.plots.slice(0, DATA.MAX_PLOTS).map((p, i) => {
      const plot = { ...freshPlot(i), ...(p || {}), id: i };
      if (!DATA.TIERS[plot.tier]) plot.tier = 'wood';
      plot.sprinkler = !!plot.sprinkler;
      plot.net = !!plot.net;
      plot.umbrella = !!plot.umbrella;
      if (plot.crop && !DATA.PLANTS[plot.crop.plantId]) plot.crop = null; // نبتة غير معروفة
      if (plot.crop) {
        const c = plot.crop;
        c.progress = Math.max(0, Number(c.progress) || 0);
        c.nextThirstAt = Number(c.nextThirstAt) || 0;
        c.thirsty = !!c.thirsty;
        c.harvests = safeInt(c.harvests, 0);
        c.bird = 0; // العصافير تطير عند إغلاق اللعبة
        c.pest = Number.isFinite(c.pest) ? c.pest : 0;
        c.fert = !!c.fert;
      }
      return plot;
    });
    return s;
  }

  // إعدادات الأهل: نقبل فقط القيم الصحيحة ونكمل الناقص من الافتراضي
  function cleanParent(p) {
    const out = freshParent();
    if (!p || typeof p !== 'object') return out;
    const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    for (const k of ['warn', 'sleepOn', 'schoolOn', 'sound', 'music', 'notifications']) {
      if (typeof p[k] === 'boolean') out[k] = p[k];
    }
    for (const k of ['sleepStart', 'sleepEnd', 'schoolStart', 'schoolEnd']) if (isTime(p[k])) out[k] = p[k];
    for (const k of ['extraDay', 'warnedDay']) if (isDay(p[k])) out[k] = p[k];
    if (DATA.LIMIT_OPTIONS.includes(p.limitMin)) out.limitMin = p.limitMin;
    out.extraMin = safeInt(p.extraMin, 0);
    if (typeof p.pin === 'string') out.pin = p.pin;
    if (Array.isArray(p.schoolDays)) out.schoolDays = [...new Set(p.schoolDays.filter(n => Number.isInteger(n) && n >= 0 && n <= 6))];
    return out;
  }

  function safeInt(v, fallback) {
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
  }

  function cleanCounts(obj) {
    const out = {};
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const n = safeInt(obj[k], 0);
        if (n > 0) out[k] = n;
      }
    }
    return out;
  }

  // ترقية الحفظ من إصدارات أقدم (تُضاف خطوات هنا مع كل إصدار جديد)
  function migrate(d, now) {
    if (!d || typeof d !== 'object') return null;
    const v = Number(d.version) || 1;
    // v1 → v2: الطاقة، الأدوات، أنواع الأحواض (تُملأ بقيمها الافتراضية في normalize)
    if (v < 2) { d.energy = DATA.ENERGY_MAX; d.energyDay = ''; }
    // v2 → v3: العصافير والشبكات والفزاعة (قيم افتراضية من normalize)
    // v3 → v4: إعدادات الأهل وسجل وقت اللعب (قيم افتراضية من normalize)
    // v4 → v5: الطقس، طلبات الجيران، الحمام الزاجل، مكافأة الدخول، الآفات، السماد، المظلة
    return normalize(d, now);
  }

  function load(now) {
    try {
      const raw = localStorage.getItem(DATA.SAVE_KEY);
      if (!raw) return null;
      return migrate(JSON.parse(raw), now);
    } catch (e) {
      console.warn('تعذّر تحميل الحفظ', e);
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(DATA.SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.warn('تعذّر الحفظ', e);
      return false;
    }
  }

  function clear() {
    try { localStorage.removeItem(DATA.SAVE_KEY); } catch (e) { /* لا شيء */ }
  }

  return { fresh, load, save, clear, migrate, freshParent };
})();
