'use strict';
/* =========================================================
   game.js — منطق اللعبة: النمو بالوقت، الزراعة، السقاية، الحصاد، البيع،
   الطاقة اليومية، الخبرة والمستويات، الأحواض والترقيات والأدوات
   ---------------------------------------------------------
   النمو يُخزَّن كـ "تقدّم" (ميلي ثانية من النمو المتراكم) وليس كوقت زراعة،
   لذلك تغيير ساعة الجهاز للخلف لا يُنتج تقدماً سالباً أبداً.

   قاعدة العطش:
   - النبتة تحتاج سقاية عند الزراعة، ثم تعطش عند كل "محطة" (ربع مدة النمو، 10 دقائق على الأقل)
     لكن فقط أثناء اللعب.
   - أثناء الغياب (اللعبة مغلقة) التربة تحفظ الرطوبة: النبتة المسقية تكمل نموها
     ولا تعطش. أما النبتة التي كانت عطشانة لحظة الإغلاق فتبقى متوقفة (بلا أي خسارة).
   - الحوض الذي فيه رشاش أوتوماتيكي لا يعطش أبداً.

   الجدّة تسقي عنك: إذا غاب الطفل أكثر من 24 ساعة تُحسب كل النباتات العطشانة
   وكأنها سُقيت مرة واحدة خلال الغياب، وتظهر رسالة لطيفة عند العودة.

   العصافير: تزور النباتات التي تكبر أثناء اللعب فقط، وتبطئ نموها وهي واقفة.
   لا تأكل شيئاً ولا تُفقد أي تقدم، وتطير لوحدها بعد قليل أو عند إغلاق اللعبة.
   ========================================================= */

const Game = (() => {
  let state = null;
  const listeners = {};

  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, payload) { (listeners[evt] || []).forEach(fn => fn(payload)); }

  let dirty = false;
  let savingEnabled = true;
  function markDirty() { dirty = true; }
  function save() { if (savingEnabled) SaveStore.save(state); dirty = false; }
  function stopSaving() { savingEnabled = false; }
  function saveIfDirty() { if (dirty) save(); }
  function commit() { markDirty(); save(); emit('change'); }

  function init() {
    const now = Date.now();
    state = SaveStore.load(now) || SaveStore.fresh(now);
    tick(now);
    save();
    return state;
  }

  // رسائل تنتظر الواجهة لتعرضها (مثل زيارة الجدّة)
  const notices = [];
  function takeNotices() { return notices.splice(0); }

  // أثناء شاشات النوم ووقت المدرسة وانتهاء الوقت: لا عصافير
  let paused = false;
  function setPaused(v) {
    paused = !!v;
    if (paused && state) clearBirds();
  }

  const isFirstRun = () => !state.roofName;
  const plant = id => DATA.PLANTS[id];
  // المظلة تجعل الحوض يعطش نص المرات
  const waterInterval = (p, plot) =>
    Math.max(DATA.MIN_WATER_INTERVAL, p.growMs * DATA.WATER_FRACTION) * (plot && plot.umbrella ? DATA.UMBRELLA_WATER_MULT : 1);
  // المرحلة 4: الطقس المشمس، الآفات، السماد
  // الطقس المشمس يسرّع، والعصفور والدودة يبطئان (الدودة لا تبطئ أثناء الغياب)
  function growthRate(crop, away) {
    let r = DATA.WEATHER[state.weather.type].growth;
    if (crop && crop.bird) r *= DATA.BIRDS.SLOW;
    if (crop && crop.pest && !away) r *= DATA.PESTS.SLOW;
    return r;
  }

  /* ---------- الوقت ---------- */

  function tick(now) {
    refreshEnergy(now);
    refreshDay(now);
    let dt = now - state.lastSeen;
    if (!Number.isFinite(dt) || dt < 0) {
      // الساعة رجعت للخلف: لا نمو سالب، نبدأ العدّ من الوقت الحالي
      state.lastSeen = now;
      clearBirds();
      markDirty();
      return;
    }
    if (dt === 0) return;
    if (dt > DATA.GRANDMA_AFTER) grandmaVisit();
    dt = Math.min(dt, DATA.MAX_CATCHUP); // قفزة كبيرة للأمام = 7 أيام كحد أقصى
    state.lastSeen = now;
    const away = dt > DATA.AWAY_THRESHOLD;
    if (away) clearBirds(); // أثناء الغياب لا توجد عصافير
    state.plots.forEach((plot, i) => grow(plot, dt, away, i));
    if (!away && !paused) { birdTick(now, dt); pestTick(now, dt); }
    markDirty();
  }

  // الجدّة تسقي كل نبتة عطشانة مرة واحدة، والغياب بعدها لا يعطّش النباتات
  function grandmaVisit() {
    let watered = 0;
    let planted = 0;
    state.plots.forEach(plot => {
      const c = plot.crop;
      if (!c) return;
      planted++;
      if (c.thirsty && c.progress < plant(c.plantId).growMs) {
        c.thirsty = false;
        watered++;
      }
    });
    notices.push({ type: 'grandma', watered, planted });
  }

  /* ---------- نقطة التوقف: سطحك مرتاح ---------- */

  function restInfo() {
    let ready = 0, thirsty = 0, empty = 0, growing = 0;
    let nextMs = Infinity;
    state.plots.forEach((plot, i) => {
      const c = cropInfo(i);
      if (!c) { empty++; return; }
      if (c.ready) ready++;
      else if (c.thirsty) thirsty++;
      else { growing++; nextMs = Math.min(nextMs, c.remainingMs); }
    });
    const unlocked = DATA.PLANT_ORDER.map(plant).filter(isUnlocked);
    const cheapest = Math.min(...unlocked.map(p => p.seedPrice));
    const storage = Object.keys(state.crops).reduce((a, id) => a + state.crops[id] * sellPriceFor(id), 0);
    const hasSeeds = Object.keys(state.seeds).length > 0;
    const canPlant = empty > 0 && (hasSeeds || state.coins + storage >= cheapest);
    const outOfEnergy = state.energy < DATA.ENERGY_WATER;
    const resting = ready === 0 && (outOfEnergy || (thirsty === 0 && !canPlant));
    return { resting, outOfEnergy, growing, nextMs: Number.isFinite(nextMs) ? nextMs : null };
  }

  /* ---------- العصافير ---------- */

  let birdClock = 0;

  function birdTick(now, dt) {
    const B = DATA.BIRDS;
    // العصفور يطير لوحده بعد قليل، أو عندما تجهز النبتة
    state.plots.forEach((plot, i) => {
      const c = plot.crop;
      if (c && c.bird && (now - c.bird > B.STAY_MS || c.bird > now || c.progress >= plant(c.plantId).growMs)) {
        c.bird = 0;
        emit('birdLeave', { index: i, shooed: false });
      }
    });

    birdClock += dt;
    if (birdClock < B.CHECK_MS) return;
    birdClock = 0;
    if (state.scarecrow) return;

    // النباتات في مراحل النمو الأكبر تجذب العصافير أكثر
    const targets = [];
    let perched = 0;
    let growing = 0;
    state.plots.forEach((plot, i) => {
      if (!plot.crop) return;
      if (plot.crop.bird) { perched++; return; }
      const info = cropInfo(i);
      if (info.ready || plot.net) return;
      growing++;
      for (let w = 0; w <= info.stage; w++) targets.push(i);
    });
    if (!growing || perched >= B.MAX_PERCHED) return;
    if (Math.random() > Math.min(B.MAX_CHANCE, B.CHANCE_PER_PLANT * growing)) return;
    const i = targets[Math.floor(Math.random() * targets.length)];
    state.plots[i].crop.bird = now;
    emit('birdLand', i);
  }

  function clearBirds() {
    state.plots.forEach((plot, i) => {
      if (plot.crop && plot.crop.bird) {
        plot.crop.bird = 0;
        emit('birdLeave', { index: i, shooed: false });
      }
    });
  }

  function shooBird(i) {
    const c = state.plots[i] && state.plots[i].crop;
    if (!c || !c.bird) return { ok: false };
    c.bird = 0;
    emit('birdLeave', { index: i, shooed: true });
    const n = (state.stats.birdsShooed || 0) + 1;
    state.stats.birdsShooed = n;
    const rewards = [];
    if (n % DATA.GUARD.NET_EVERY === 0) {
      state.tools.net = (state.tools.net || 0) + 1;
      rewards.push('net');
    }
    if (n >= DATA.GUARD.SCARECROW_AT && !state.scarecrow) {
      state.scarecrow = true;
      rewards.push('scarecrow');
      clearBirds();
    }
    commit();
    return { ok: true, count: n, rewards };
  }

  function guardProgress() {
    const n = state.stats.birdsShooed || 0;
    const G = DATA.GUARD;
    return {
      shooed: n,
      netIn: G.NET_EVERY - (n % G.NET_EVERY),
      netDone: n % G.NET_EVERY,
      scarecrowLeft: Math.max(0, G.SCARECROW_AT - n),
    };
  }

  // سقاية تلقائية: الرشاش دائماً، والمطر مرة واحدة لكل حوض في اليوم الماطر
  function autoWater(plot, index) {
    const crop = plot.crop;
    if (!crop || !crop.thirsty) return;
    if (plot.sprinkler) {
      crop.thirsty = false;
      emit('sprinkled', index);
    } else if (state.weather.type === 'rainy' && !state.weather.rained.includes(index)) {
      crop.thirsty = false;
      state.weather.rained.push(index);
      emit('rained', index);
    }
  }

  function grow(plot, dt, away, index) {
    const crop = plot.crop;
    if (!crop) return;
    const p = plant(crop.plantId);
    if (crop.progress >= p.growMs) return;
    autoWater(plot, index);
    if (crop.thirsty) return;
    const W = waterInterval(p, plot);
    const target = crop.progress + dt * growthRate(crop, away);

    if (away || plot.sprinkler) {
      crop.progress = Math.min(p.growMs, target);
      while (crop.nextThirstAt <= crop.progress) crop.nextThirstAt += W;
    } else if (crop.nextThirstAt < p.growMs && target >= crop.nextThirstAt) {
      crop.progress = Math.max(crop.progress, crop.nextThirstAt);
      crop.nextThirstAt += W;
      crop.thirsty = true;
      emit('thirsty', index);
      autoWater(plot, index);
    } else {
      crop.progress = Math.min(p.growMs, target);
    }
    if (crop.progress >= p.growMs) emit('ready', index);
  }

  /* ---------- اليوم الجديد: الطقس وطلبات الجيران ---------- */

  function refreshDay(now) {
    const key = dayKey(now);
    if (state.weather.day === key) return;
    const firstEver = !state.weather.day;
    // الطقس يُختار مرة واحدة لكل يوم
    const list = Object.values(DATA.WEATHER);
    let r = Math.random() * list.reduce((a, w) => a + w.weight, 0);
    let pick = list[0];
    for (const w of list) { r -= w.weight; if (r < 0) { pick = w; break; } }
    state.weather = { day: key, type: firstEver ? 'sunny' : pick.id, rained: [] };
    // الطلبات المنفّذة تُستبدل، وغير المنفّذة تبقى كما هي
    state.orders = state.orders.filter(o => !o.done);
    while (state.orders.length < DATA.ORDERS.SLOTS) state.orders.push(makeOrder());
    markDirty();
  }

  function makeOrder() {
    const N = DATA.ORDERS.NEIGHBORS;
    const used = state.orders.map(o => o.who);
    const free = N.map((_, i) => i).filter(i => !used.includes(i));
    const who = free[Math.floor(Math.random() * free.length)];
    // من النباتات المفتوحة، وكمية تناسب مدة النمو
    const plants = DATA.PLANT_ORDER.map(plant).filter(isUnlocked);
    const p = plants[Math.floor(Math.random() * plants.length)];
    const h = p.growMs / DATA.HOUR;
    const [lo, hi] = h <= 0.34 ? [3, 6] : h <= 1 ? [2, 4] : h <= 6 ? [1, 3] : [1, 2];
    return { who, plantId: p.id, qty: lo + Math.floor(Math.random() * (hi - lo + 1)), done: false };
  }

  const orderReward = o => plant(o.plantId).sellPrice * o.qty * DATA.ORDERS.REWARD_MULT;

  function fulfillOrder(k) {
    const o = state.orders[k];
    if (!o || o.done) return { ok: false, reason: 'none' };
    if ((state.crops[o.plantId] || 0) < o.qty) return { ok: false, reason: 'crops' };
    state.crops[o.plantId] -= o.qty;
    if (!state.crops[o.plantId]) delete state.crops[o.plantId];
    const coins = orderReward(o);
    state.coins += coins;
    state.stats.earned += coins;
    o.done = true;
    commit();
    return { ok: true, coins, order: o };
  }

  const canFulfill = o => !o.done && (state.crops[o.plantId] || 0) >= o.qty;

  /* ---------- هدايا ثابتة: الحمام الزاجل ومكافأة الدخول ---------- */

  function giveGift(g) {
    if (g.coins) state.coins += g.coins;
    if (g.seeds) for (const id of Object.keys(g.seeds)) state.seeds[id] = (state.seeds[id] || 0) + g.seeds[id];
  }

  const pigeonWaiting = (now = Date.now()) => state.pigeon.lastFedDay !== dayKey(now);

  function feedPigeon(now = Date.now()) {
    if (!pigeonWaiting(now)) return { ok: false };
    const gift = DATA.PIGEON_GIFTS[state.pigeon.visits % DATA.PIGEON_GIFTS.length];
    giveGift(gift);
    state.pigeon.visits++;
    state.pigeon.lastFedDay = dayKey(now);
    commit();
    return { ok: true, gift };
  }

  // أول دخول في كل يوم: نعدّ الأيام الكلية. اليوم الأول = هدية البداية
  function claimLogin(now = Date.now()) {
    const key = dayKey(now);
    if (state.login.lastDay === key) return null;
    state.login.lastDay = key;
    state.login.days++;
    let reward = null;
    if (state.login.days > 1) {
      reward = DATA.LOGIN_REWARDS[(state.login.days - 2) % DATA.LOGIN_REWARDS.length];
      giveGift(reward);
    }
    commit();
    return { days: state.login.days, reward, weather: DATA.WEATHER[state.weather.type] };
  }

  /* ---------- الآفات ---------- */

  let pestClock = 0;

  function pestTick(now, dt) {
    const P = DATA.PESTS;
    pestClock += dt;
    if (pestClock < P.CHECK_MS) return;
    pestClock = 0;
    const growing = [];
    let pests = 0;
    state.plots.forEach((plot, i) => {
      if (!plot.crop) return;
      if (plot.crop.pest) { pests++; return; }
      if (plot.crop.progress < plant(plot.crop.plantId).growMs) growing.push(i);
    });
    if (!growing.length || pests >= P.MAX) return;
    if (Math.random() > Math.min(P.MAX_CHANCE, P.CHANCE_PER_PLANT * growing.length)) return;
    const i = growing[Math.floor(Math.random() * growing.length)];
    state.plots[i].crop.pest = now;
    emit('pest', i);
  }

  function removePest(i) {
    const c = state.plots[i] && state.plots[i].crop;
    if (!c || !c.pest) return { ok: false };
    c.pest = 0;
    state.stats.pestsRemoved = (state.stats.pestsRemoved || 0) + 1;
    commit();
    return { ok: true };
  }

  /* ---------- السماد ---------- */

  function fertilize(i) {
    const t = DATA.TOOLS.fertilizer;
    const plot = state.plots[i];
    const info = cropInfo(i);
    if (!info) return { ok: false, reason: 'empty' };
    if (info.ready) return { ok: false, reason: 'ready' };
    if (plot.crop.fert) return { ok: false, reason: 'done' };
    if (!state.tools.fertilizer) return { ok: false, reason: 'none' };
    if (!spendEnergy(t.energy)) return { ok: false, reason: 'energy' };
    state.tools.fertilizer--;
    if (!state.tools.fertilizer) delete state.tools.fertilizer;
    const c = plot.crop;
    const p = info.plant;
    c.progress += (p.growMs - c.progress) * t.boost;
    c.fert = true;
    const W = waterInterval(p, plot);
    while (c.nextThirstAt <= c.progress) c.nextThirstAt += W;
    commit();
    return { ok: true };
  }

  /* ---------- الطاقة اليومية ---------- */

  // مفتاح اليوم يبدأ الساعة 6 صباحاً بتوقيت الجهاز
  function dayKey(now) {
    const d = new Date(now - DATA.ENERGY_RESET_HOUR * DATA.HOUR);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function refreshEnergy(now) {
    const key = dayKey(now);
    const last = state.energyDay;
    if (!last || key > last) {
      // صباح جديد: الطاقة تتجدد بالكامل مرة واحدة
      state.energy = DATA.ENERGY_MAX;
      state.energyDay = key;
      markDirty();
    } else if (Date.parse(last) - Date.parse(key) > 2 * DATA.DAY) {
      // الساعة كانت مضبوطة على المستقبل ثم صُحّحت: نعيد المرجع بدون تجديد إضافي
      state.energyDay = key;
      markDirty();
    }
  }

  function spendEnergy(n) {
    if (state.energy < n) return false;
    state.energy -= n;
    return true;
  }

  /* ---------- الخبرة والمستويات ---------- */

  function levelInfo(xp = state.xp) {
    let level = 1;
    let left = xp;
    while (left >= DATA.xpToNext(level)) {
      left -= DATA.xpToNext(level);
      level++;
    }
    return { level, into: left, need: DATA.xpToNext(level) };
  }
  const level = () => levelInfo().level;

  // ما يُفتح عند الوصول لمستوى معيّن
  function unlocksAt(L) {
    const list = [];
    DATA.PLANT_ORDER.forEach(id => { const p = plant(id); if (p.unlockLevel === L) list.push({ type: 'plant', plant: p }); });
    DATA.PLOT_UNLOCKS.forEach(u => { if (u.level === L) list.push({ type: 'plot' }); });
    DATA.TIER_ORDER.forEach(id => { const t = DATA.TIERS[id]; if (t.level === L && t.price) list.push({ type: 'tier', tier: t }); });
    DATA.TOOL_ORDER.forEach(id => { const t = DATA.TOOLS[id]; if (t.level === L) list.push({ type: 'tool', tool: t }); });
    return list;
  }

  /* ---------- معلومات للعرض ---------- */

  function cropInfo(i) {
    const plot = state.plots[i];
    const crop = plot && plot.crop;
    if (!crop) return null;
    const p = plant(crop.plantId);
    const pct = Math.min(1, crop.progress / p.growMs);
    const ready = pct >= 1;
    let stage = 0;
    if (ready) stage = 3;
    else if (pct >= DATA.STAGE_FLOWER) stage = 2;
    else if (pct >= DATA.STAGE_SPROUT) stage = 1;
    // الشجرة المثمرة بعد أول حصاد تبقى كبيرة ومزهرة
    if (crop.harvests > 0 && stage < 2) stage = 2;
    return {
      plant: p,
      pct,
      stage,
      ready,
      thirsty: !ready && crop.thirsty,
      remainingMs: ready ? 0 : (p.growMs - crop.progress) / growthRate(crop, false),
      harvestNo: crop.harvests + 1,
      harvestsTotal: p.repeat ? p.repeat.harvests : 1,
    };
  }

  const cropCount = () => Object.values(state.crops).reduce((a, b) => a + b, 0);
  const isUnlocked = p => level() >= p.unlockLevel;
  const tierOf = i => DATA.TIERS[state.plots[i].tier];

  function nextTier(i) {
    const idx = DATA.TIER_ORDER.indexOf(state.plots[i].tier);
    const id = DATA.TIER_ORDER[idx + 1];
    return id ? DATA.TIERS[id] : null;
  }

  function nextPlot() {
    const n = state.plots.length;
    if (n >= DATA.MAX_PLOTS) return null;
    const u = DATA.PLOT_UNLOCKS[n - DATA.START_PLOTS];
    return { number: n + 1, ...u, levelOk: level() >= u.level, coinsOk: state.coins >= u.price };
  }

  /* ---------- الأفعال ---------- */

  function buySeed(plantId, n = 1) {
    const p = plant(plantId);
    if (!p) return { ok: false, reason: 'unknown' };
    if (!isUnlocked(p)) return { ok: false, reason: 'level' };
    const cost = p.seedPrice * n;
    if (state.coins < cost) return { ok: false, reason: 'coins' };
    state.coins -= cost;
    state.seeds[plantId] = (state.seeds[plantId] || 0) + n;
    commit();
    return { ok: true };
  }

  function plantSeed(i, plantId) {
    const plot = state.plots[i];
    const p = plant(plantId);
    if (!plot || !p) return { ok: false, reason: 'unknown' };
    if (plot.crop) return { ok: false, reason: 'occupied' };
    if (!state.seeds[plantId]) return { ok: false, reason: 'noSeeds' };
    state.seeds[plantId]--;
    if (!state.seeds[plantId]) delete state.seeds[plantId];
    plot.crop = {
      plantId,
      progress: 0,
      nextThirstAt: waterInterval(p, plot),
      thirsty: true, // تحتاج سقاية عند الزراعة (إلا إذا سقاها الرشاش أو المطر)
      harvests: 0,
      bird: 0,
      pest: 0,
      fert: false,
      plantedAt: Date.now(),
    };
    autoWater(plot, i);
    const autoWatered = !plot.crop.thirsty;
    commit();
    return { ok: true, sprinkled: autoWatered, rained: autoWatered && !plot.sprinkler };
  }

  function water(i) {
    const info = cropInfo(i);
    if (!info) return { ok: false, reason: 'empty' };
    if (info.ready) return { ok: false, reason: 'ready' };
    if (!info.thirsty) return { ok: false, reason: 'notThirsty' };
    if (!spendEnergy(DATA.ENERGY_WATER)) return { ok: false, reason: 'energy' };
    state.plots[i].crop.thirsty = false;
    commit();
    return { ok: true };
  }

  function harvest(i) {
    const info = cropInfo(i);
    if (!info || !info.ready) return { ok: false, reason: 'notReady' };
    const p = info.plant;
    const plot = state.plots[i];
    const levelBefore = level();

    state.crops[p.id] = (state.crops[p.id] || 0) + 1;
    state.xp += p.xp;
    // مكافأة نوع الحوض تُدفع مباشرة عند الحصاد
    const bonus = Math.round(p.sellPrice * tierOf(i).bonus);
    state.coins += bonus;
    const count = state.stats.harvested[p.id] || 0;
    state.stats.harvested[p.id] = count + 1;

    const crop = plot.crop;
    crop.harvests++;
    if (p.repeat && crop.harvests < p.repeat.harvests) {
      // شجرة مثمرة: تبدأ دورة ثمار جديدة
      crop.progress = 0;
      crop.nextThirstAt = waterInterval(p, plot);
      crop.thirsty = true;
      crop.pest = 0;
      crop.fert = false;
      autoWater(plot, i);
    } else {
      plot.crop = null;
    }

    const levelAfter = level();
    commit();
    const levelUps = [];
    for (let L = levelBefore + 1; L <= levelAfter; L++) levelUps.push({ level: L, unlocks: unlocksAt(L) });
    // المعلومات تتناوب بالترتيب (بلا عشوائية)
    return { ok: true, plant: p, xp: p.xp, bonus, fact: p.facts[count % p.facts.length], levelUps };
  }

  const sellPriceFor = plantId => plant(plantId).sellPrice;

  function sell(plantId, n = 1) {
    const have = state.crops[plantId] || 0;
    n = Math.min(n, have);
    if (n <= 0) return { ok: false, reason: 'none' };
    const coins = sellPriceFor(plantId) * n;
    state.crops[plantId] = have - n;
    if (!state.crops[plantId]) delete state.crops[plantId];
    state.coins += coins;
    state.stats.sold += n;
    state.stats.earned += coins;
    commit();
    return { ok: true, coins };
  }

  function sellAll() {
    let coins = 0;
    for (const id of Object.keys(state.crops)) {
      const r = sell(id, state.crops[id]);
      if (r.ok) coins += r.coins;
    }
    return coins > 0 ? { ok: true, coins } : { ok: false, reason: 'none' };
  }

  function buyTool(toolId) {
    const t = DATA.TOOLS[toolId];
    if (!t) return { ok: false, reason: 'unknown' };
    if (t.reward) return { ok: false, reason: 'reward' };
    if (level() < t.level) return { ok: false, reason: 'level' };
    if (state.coins < t.price) return { ok: false, reason: 'coins' };
    state.coins -= t.price;
    state.tools[toolId] = (state.tools[toolId] || 0) + 1;
    commit();
    return { ok: true };
  }

  // تركيب أداة على حوض (رشاش أو شبكة)، وتبقى عليه دائماً
  function installTool(i, toolId) {
    const plot = state.plots[i];
    if (!plot || !DATA.TOOLS[toolId] || DATA.TOOLS[toolId].use) return { ok: false, reason: 'unknown' };
    if (plot[toolId]) return { ok: false, reason: 'has' };
    if (!state.tools[toolId]) return { ok: false, reason: 'none' };
    state.tools[toolId]--;
    if (!state.tools[toolId]) delete state.tools[toolId];
    plot[toolId] = true;
    if (toolId === 'sprinkler' && plot.crop) plot.crop.thirsty = false;
    if (toolId === 'net' && plot.crop && plot.crop.bird) {
      plot.crop.bird = 0;
      emit('birdLeave', { index: i, shooed: false });
    }
    commit();
    return { ok: true };
  }

  function unlockPlot() {
    const next = nextPlot();
    if (!next) return { ok: false, reason: 'max' };
    if (!next.levelOk) return { ok: false, reason: 'level' };
    if (!next.coinsOk) return { ok: false, reason: 'coins' };
    state.coins -= next.price;
    const i = state.plots.length;
    state.plots.push({ id: i, tier: 'wood', sprinkler: false, net: false, crop: null });
    commit();
    return { ok: true, index: i };
  }

  function upgradePlot(i) {
    const t = nextTier(i);
    if (!t) return { ok: false, reason: 'max' };
    if (level() < t.level) return { ok: false, reason: 'level' };
    if (state.coins < t.price) return { ok: false, reason: 'coins' };
    state.coins -= t.price;
    state.plots[i].tier = t.id;
    commit();
    return { ok: true, tier: t };
  }

  function setRoofName(name) {
    const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, DATA.MAX_ROOF_NAME);
    state.roofName = clean || DATA.DEFAULT_ROOF_NAME;
    commit();
  }

  return {
    init, tick, save, saveIfDirty, stopSaving, on,
    get state() { return state; },
    isFirstRun, cropInfo, cropCount, sellPriceFor, levelInfo, level, unlocksAt, isUnlocked,
    tierOf, nextTier, nextPlot, dayKey, takeNotices, setPaused, restInfo,
    fulfillOrder, orderReward, canFulfill, pigeonWaiting, feedPigeon, claimLogin, removePest, fertilize,
    get weather() { return DATA.WEATHER[state.weather.type]; },
    buySeed, plantSeed, water, harvest, sell, sellAll, setRoofName,
    buyTool, installTool, unlockPlot, upgradePlot, shooBird, guardProgress,
  };
})();
