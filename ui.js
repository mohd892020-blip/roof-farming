'use strict';
/* =========================================================
   ui.js — الرسم والتفاعل
   ========================================================= */

const UI = (() => {
  const $ = id => document.getElementById(id);
  const el = {};

  // الوضع الحالي: none | water | plant
  let mode = { type: 'none' };
  let sheet = null;          // { kind, opts }
  let plotVisualKeys = [];
  let shownCoins = 0;
  let coinHold = 0;
  let toastTimer = 0;
  let factTimer = 0;

  /* =====================================================
     الرسومات (SVG مؤقتة، أو صور PNG من data.js)
     ===================================================== */

  const Art = (() => {
    function leafPath(s, round) {
      const w = s * (round ? 0.46 : 0.3);
      return `M0 0C${w} ${-s * .22} ${w * 1.05} ${-s * .7} 0 ${-s}C${-w * 1.05} ${-s * .7} ${-w} ${-s * .22} 0 0Z`;
    }
    function leaf(L, x, y, ang, s, alt) {
      s *= L.leafScale || 1;
      return `<g transform="translate(${x} ${y}) rotate(${ang})">` +
        `<path d="${leafPath(s, L.shape === 'round')}" fill="${alt ? L.leaf2 : L.leaf}" stroke="${L.edge}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<path d="M0 -1V${-s * .78}" stroke="${L.edge}" stroke-width=".9" opacity=".45"/></g>`;
    }
    const leaves = (L, list) => list.map(a => leaf(L, ...a)).join('');
    const stem = (L, d, w = 3) => `<path d="${d}" stroke="${L.stem}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    function flower(L, x, y, r = 3) {
      let petals = '';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        petals += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${r * .75}" fill="${L.flower}" stroke="rgba(0,0,0,.12)" stroke-width=".6"/>`;
      }
      return petals + `<circle cx="${x}" cy="${y}" r="${r * .55}" fill="#f6a821"/>`;
    }
    function fruit(L, x, y, r) {
      if (L.fruitShape === 'long') {
        return `<g transform="rotate(12 ${x} ${y})">` +
          `<ellipse cx="${x}" cy="${y + r * .5}" rx="${r * .55}" ry="${r * 1.35}" fill="${L.fruit}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>` +
          `<ellipse cx="${x - r * .2}" cy="${y + r * .2}" rx="${r * .14}" ry="${r * .5}" fill="#fff" opacity=".5"/>` +
          `<path d="M${x - 3.5} ${y - r * .7} Q${x} ${y - r * 1.15} ${x + 3.5} ${y - r * .7}Z M${x} ${y - r * 1} V${y - r * 1.6}" stroke="${L.leaf2}" stroke-width="2" fill="${L.leaf2}" stroke-linecap="round"/></g>`;
      }
      const rx = L.fruitShape === 'oval' ? r * 1.1 : r;
      const ry = L.fruitShape === 'oval' ? r * .85 : r;
      return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${L.fruit}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>` +
        `<ellipse cx="${x - r * .35}" cy="${y - r * .35}" rx="${r * .3}" ry="${r * .2}" fill="#fff" opacity=".6"/>` +
        `<path d="M${x - 3.5} ${y - r + 1} L${x} ${y - r - 2} L${x + 3.5} ${y - r + 1} M${x} ${y - r - 2} V${y - r + 2}" stroke="${L.stem}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    }
    const mound = '<ellipse cx="50" cy="95" rx="21" ry="5" fill="#3f2210" opacity=".45"/>';

    function stage0() {
      return '<ellipse cx="50" cy="93" rx="18" ry="7" fill="#6b3f1f"/><ellipse cx="50" cy="91" rx="12" ry="4" fill="#80502b"/>' +
        '<ellipse cx="45" cy="90" rx="3.2" ry="2.1" fill="#e6c992" transform="rotate(-20 45 90)"/>' +
        '<ellipse cx="55" cy="90.5" rx="3.2" ry="2.1" fill="#e6c992" transform="rotate(25 55 90.5)"/>';
    }
    function stage1(L) {
      return mound + stem(L, 'M50 95 Q49 86 50 76') +
        leaves(L, [[50, 81, -58, 15, 0], [50, 81, 58, 15, 1], [50, 77, 0, 10, 0]]);
    }
    function stage2(L) {
      let s = mound +
        stem(L, 'M50 96 Q48 75 50 50') + stem(L, 'M50 80 Q40 72 36 62', 2.4) + stem(L, 'M50 74 Q60 66 64 58', 2.4) +
        leaves(L, [
          [50, 86, -62, 16, 1], [50, 86, 62, 16, 0], [36, 64, -40, 15, 0], [64, 60, 40, 15, 1],
          [50, 70, -50, 17, 0], [50, 62, 50, 16, 1], [50, 54, -25, 14, 0], [50, 54, 25, 14, 1],
        ]);
      const spots = L.fruit ? [[36, 58], [64, 54], [50, 47]] : [[50, 46], [45, 50], [55, 50], [36, 58], [64, 54]];
      s += spots.map(([x, y]) => flower(L, x, y, L.fruit ? 3.4 : 2.6)).join('');
      return s;
    }
    function stage3(L) {
      let s = '<ellipse cx="50" cy="95" rx="26" ry="5.5" fill="#3f2210" opacity=".45"/>' +
        stem(L, 'M50 96 Q50 70 50 38', 3.6) + stem(L, 'M50 88 Q36 76 28 54', 2.8) + stem(L, 'M50 84 Q66 72 72 50', 2.8) +
        leaves(L, [
          [50, 86, -65, 18, 0], [50, 86, 65, 18, 1],
          [28, 56, -20, 16, 1], [31, 64, -60, 16, 0], [37, 73, -80, 15, 1],
          [72, 52, 20, 16, 0], [69, 60, 60, 16, 1], [63, 70, 80, 15, 0],
          [50, 72, -45, 19, 1], [50, 72, 45, 19, 0], [50, 58, -35, 18, 0], [50, 58, 35, 18, 1],
          [50, 46, -15, 16, 1], [50, 46, 15, 16, 0], [50, 40, 0, 14, 0],
        ]);
      if (L.fruit) s += [[38, 70, 7], [62, 64, 7.5], [46, 54, 6.5], [58, 80, 7], [30, 59, 6]].map(a => fruit(L, ...a)).join('');
      return s;
    }
    const STAGES = [stage0, stage1, stage2, stage3];

    function plant(p, stage) {
      if (DATA.ART.useImages && p.images && p.images.stages[stage]) {
        return `<img src="${p.images.stages[stage]}" alt="" draggable="false">`;
      }
      return `<svg viewBox="0 0 100 100" aria-hidden="true">${STAGES[stage](p.look)}</svg>`;
    }
    function icon(p) {
      if (DATA.ART.useImages && p.images && p.images.icon) {
        return `<img src="${p.images.icon}" alt="" draggable="false">`;
      }
      return `<svg viewBox="12 24 76 76" aria-hidden="true">${stage3(p.look)}</svg>`;
    }
    return { plant, icon };
  })();

  /* =====================================================
     تنسيق الوقت بالعربية
     ===================================================== */

  function plural(n, one, two, few) {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${n} ${few}`;
    return `${n} ${one}`;
  }
  function fmtLong(ms) {
    const m = Math.ceil(ms / DATA.MIN);
    if (m <= 1) return 'دقيقة';
    if (m < 60) return plural(m, 'دقيقة', 'دقيقتين', 'دقائق');
    const h = Math.floor(m / 60), r = m % 60;
    const hs = plural(h, 'ساعة', 'ساعتين', 'ساعات');
    return r ? `${hs} و${plural(r, 'دقيقة', 'دقيقتين', 'دقائق')}` : hs;
  }
  // عداد بالثواني: 4:05 أو 1:02:09
  function fmtClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = String(total % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  }

  /* =====================================================
     الأحواض
     ===================================================== */

  const plotCols = n => (n <= 9 ? 3 : 4);
  const SKY_MIN = 120;

  function buildPlots() {
    const plots = Game.state.plots;
    const cols = plotCols(plots.length);
    const rows = Math.ceil(plots.length / cols);
    el.plots.style.setProperty('--cols', cols);
    el.plots.innerHTML = '';
    plotVisualKeys = [];
    plots.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const b = document.createElement('button');
      b.className = 'plot';
      b.dataset.i = i;
      // الصفوف الخلفية أصغر قليلاً لإحساس العمق
      b.style.setProperty('--row-scale', rows > 1 ? (0.9 + 0.1 * row / (rows - 1)).toFixed(3) : 1);
      b.innerHTML = '<div class="planter"><div class="soil"></div><div class="front"></div></div>' +
        '<div class="sprinkler" hidden></div><div class="umbrella" hidden>⛱️</div><div class="plant"></div>' +
        '<div class="net" hidden></div><div class="pest"></div><div class="perch"></div>' +
        '<div class="extras"></div><div class="timer" hidden></div>';
      el.plots.appendChild(b);
      plotVisualKeys.push('');
    });
    layoutPlots();
  }

  // تصغير شبكة الأحواض لتتسع في الشاشة (حتى 16 حوضاً)
  function layoutPlots() {
    const n = Game.state.plots.length;
    const cols = plotCols(n);
    const rows = Math.ceil(n / cols);
    const natW = cols * 104 + (cols - 1) * 8;
    const natH = rows * 118 + 10;
    const availW = el.scene.clientWidth - 20;
    const availH = el.scene.clientHeight - SKY_MIN - 84 - 18;
    const z = Math.max(0.5, Math.min(1.12, availW / natW, availH / natH));
    el.plots.style.setProperty('--z', z.toFixed(3));
  }

  function renderPlots() {
    if (el.plots.children.length !== Game.state.plots.length) buildPlots();
    const btns = el.plots.children;
    let anyThirsty = false;
    Game.state.plots.forEach((plot, i) => {
      const b = btns[i];
      const info = Game.cropInfo(i);
      const key = info ? `${info.plant.id}|${info.stage}|${info.thirsty}|${info.ready}` : 'empty';
      const plantEl = b.querySelector('.plant');
      const extras = b.querySelector('.extras');
      const timer = b.querySelector('.timer');
      b.classList.toggle('tier-clay', plot.tier === 'clay');
      b.classList.toggle('tier-deco', plot.tier === 'deco');
      b.classList.toggle('has-sprinkler', plot.sprinkler);
      b.querySelector('.sprinkler').hidden = !plot.sprinkler;
      b.classList.toggle('has-net', plot.net);
      b.querySelector('.net').hidden = !plot.net;
      b.querySelector('.umbrella').hidden = !plot.umbrella;
      const pestEl = b.querySelector('.pest');
      const hasPest = !!(plot.crop && plot.crop.pest);
      if (hasPest !== (pestEl.textContent === '🐛')) pestEl.textContent = hasPest ? '🐛' : '';

      if (key !== plotVisualKeys[i]) {
        const prev = plotVisualKeys[i];
        plotVisualKeys[i] = key;
        b.classList.toggle('empty', !info);
        b.classList.toggle('thirsty', !!(info && info.thirsty));
        b.classList.toggle('ready', !!(info && info.ready));
        b.classList.toggle('wet', !!(info && !info.thirsty && !info.ready));
        b.dataset.stage = info ? info.stage : '';

        if (!info) {
          plantEl.innerHTML = '';
          extras.innerHTML = '<div class="empty-hint">+</div>';
          b.setAttribute('aria-label', 'حوض فارغ، اضغط للزراعة');
        } else {
          const stageChanged = prev && prev.split('|').slice(0, 2).join('|') !== key.split('|').slice(0, 2).join('|');
          plantEl.innerHTML = Art.plant(info.plant, info.stage);
          if (stageChanged && prev !== 'empty') replay(plantEl, 'pop');
          if (info.ready) {
            extras.innerHTML = `<div class="bubble ready">${Art.icon(info.plant)}</div>` +
              '<span class="sparkle s1">✨</span><span class="sparkle s2">✨</span>';
            b.setAttribute('aria-label', `${info.plant.name} جاهزة للحصاد`);
          } else if (info.thirsty) {
            extras.innerHTML = '<div class="bubble water">💧</div>';
            b.setAttribute('aria-label', `${info.plant.name} عطشانة، اضغط لسقايتها`);
          } else {
            extras.innerHTML = '';
            b.setAttribute('aria-label', info.plant.name);
          }
        }
      }

      if (info && !info.ready && !info.thirsty) {
        timer.hidden = false;
        timer.textContent = `⏳ ${fmtClock(info.remainingMs)}`;
        timer.classList.toggle('slow', !!plot.crop.bird);
      } else {
        timer.hidden = true;
      }
      if (info && info.thirsty) anyThirsty = true;
    });
    el.waterBtn.classList.toggle('has-thirsty', anyThirsty);
    Birds.sync();
  }

  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  /* =====================================================
     الشريط العلوي
     ===================================================== */

  function renderHud() {
    const s = Game.state;
    if (!coinHold) setCoins(s.coins);
    const lv = Game.levelInfo();
    el.levelNum.textContent = lv.level;
    el.xpFill.style.width = `${Math.round((lv.into / lv.need) * 100)}%`;
    el.energyText.textContent = `${s.energy}/${DATA.ENERGY_MAX}`;
    el.energyFill.style.width = `${(s.energy / DATA.ENERGY_MAX) * 100}%`;
    el.energyPill.classList.toggle('low', s.energy <= 5);
    const np = Game.nextPlot();
    el.upgradeBadge.hidden = !(np && np.levelOk && np.coinsOk);
    el.scarecrow.toggleAttribute('hidden', !s.scarecrow); // عنصر SVG: لا يدعم خاصية hidden
    const w = Game.weather;
    if (el.app.dataset.weather !== w.id) el.app.dataset.weather = w.id;
    el.weatherChip.textContent = w.icon;
    const ready = s.orders.filter(Game.canFulfill).length;
    el.boardBadge.hidden = !ready;
    el.boardBadge.textContent = ready;
    el.carrier.hidden = !Game.pigeonWaiting() || !!lockState || carrierLeaving;
    el.kitchenBadge.hidden = !DATA.RECIPE_ORDER.some(id => Game.canCook(DATA.RECIPES[id]));
    renderDecor();
    el.roofName.textContent = s.roofName || DATA.DEFAULT_ROOF_NAME;
    const n = Game.cropCount();
    el.shopBadge.hidden = n === 0;
    el.shopBadge.textContent = n > 99 ? '99+' : n;
  }

  /* ---------- الزينة على السطح ---------- */

  const FLAGS_SVG = (() => {
    const colors = ['#e2574c', '#ffc83d', '#4caf50', '#3aa0e8', '#b48ae0'];
    let s = '<path d="M0 6 Q200 34 400 6" stroke="#fff" stroke-width="2" fill="none"/>';
    for (let k = 0; k < 13; k++) {
      const x = 15 + k * 30;
      const y = 6 + 14 * (1 - ((x - 200) / 200) ** 2);
      s += `<path d="M${x - 11} ${y} H${x + 11} L${x} ${y + 21}Z" fill="${colors[k % colors.length]}"/>`;
    }
    return `<svg viewBox="0 0 400 44" preserveAspectRatio="none">${s}</svg>`;
  })();

  const LIGHTS_SVG = (() => {
    let s = '<path d="M0 4 Q200 34 400 4" stroke="#7a6a55" stroke-width="1.5" fill="none"/>';
    for (let k = 0; k < 11; k++) {
      const x = 20 + k * 36;
      const y = 4 + 15 * (1 - ((x - 200) / 200) ** 2);
      s += `<circle class="bulb" cx="${x}" cy="${y + 5}" r="4.5" fill="#ffe08a"/>`;
    }
    return `<svg viewBox="0 0 400 40" preserveAspectRatio="none">${s}</svg>`;
  })();

  let decorKey = '';

  function renderDecor() {
    const d = Game.state.decor;
    const key = JSON.stringify(d);
    if (key === decorKey) return;
    decorKey = key;
    el.decorLayer.innerHTML = DATA.DECOR_ORDER.filter(id => d[id]).map(id => {
      const item = DATA.DECOR[id];
      const inner = id === 'flags' ? FLAGS_SVG : id === 'lights' ? LIGHTS_SVG : item.html;
      return `<span class="deco deco-${id}" style="${item.spot}">${inner}</span>`;
    }).join('');
  }

  function setCoins(v) {
    shownCoins = v;
    el.coinCount.textContent = v;
  }

  function countCoinsTo(target) {
    const from = shownCoins;
    const start = performance.now();
    const dur = 450;
    const step = t => {
      const k = Math.min(1, (t - start) / dur);
      setCoins(Math.round(from + (target - from) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    replay(el.coinsPill, 'bump');
    Sound.play('coin');
  }

  function render() {
    renderHud();
    renderPlots();
    if (sheet) renderSheet();
    Tutorial.update();
  }

  /* =====================================================
     التفاعل مع الأحواض
     ===================================================== */

  function onPlotTap(i) {
    if (mode.type === 'upgrade') return askUpgrade(i);
    if (mode.type === 'place') return doInstallTool(i, mode.tool);
    const crop = Game.state.plots[i].crop;
    if (mode.type === 'fertilize') return doFertilize(i);
    if (crop && crop.bird) return doShoo(i);
    if (crop && crop.pest) return doRemovePest(i);
    const info = Game.cropInfo(i);
    if (!info) {
      if (mode.type === 'plant') return doPlant(i, mode.plantId);
      if (mode.type === 'water') return toast('هذا الحوض فارغ، ازرع فيه أولاً 🌱');
      return openSheet('seeds', { targetPlot: i });
    }
    if (info.ready) return doHarvest(i);
    if (info.thirsty) return doWater(i);
    if (mode.type === 'water') return toast('هذه النبتة شربت ماءً 💚');
    const round = info.harvestsTotal > 1 ? ` (حصاد ${info.harvestNo} من ${info.harvestsTotal})` : '';
    toast(`${info.plant.name} تكبر… جاهزة بعد ${fmtClock(info.remainingMs)} ⏳${round}`);
    replay(plotEl(i).querySelector('.plant'), 'wiggle');
  }

  const plotEl = i => el.plots.children[i];

  function doPlant(i, plantId) {
    const r = Game.plantSeed(i, plantId);
    if (!r.ok) {
      if (r.reason === 'noSeeds') {
        setMode({ type: 'none' });
        toast('خلصت البذور، اشترِ من المتجر 🌱');
      }
      return;
    }
    const p = DATA.PLANTS[plantId];
    render();
    puff(plotEl(i));
    Sound.play('plant');
    const msg = r.rained ? `زرعت ${p.name}! المطر سقاها 🌧️` : r.sprinkled ? `زرعت ${p.name}! الرشاش سقاها 💦` : `زرعت ${p.name}! الآن اسقِها 💧`;
    toast(r.quick ? `${msg} ⚡ بتجهز بدقيقة` : msg, r.quick ? 3200 : 2400);
    if (mode.type === 'plant' && !Game.state.seeds[plantId]) setMode({ type: 'none' });
    else if (mode.type === 'plant') updateModeBanner();
  }

  function doWater(i) {
    const r = Game.water(i);
    if (!r.ok) {
      if (r.reason === 'energy') noEnergy();
      return;
    }
    render();
    const b = plotEl(i);
    rain(b);
    Sound.play('water');
    replay(b.querySelector('.plant'), 'wiggle');
    if (Game.state.energy === 0) setMode({ type: 'none' });
    if (mode.type === 'water' && !hasThirsty()) {
      setMode({ type: 'none' });
      toast('كل النباتات شربت 💚');
    }
  }

  function doHarvest(i) {
    const b = plotEl(i);
    const from = b.querySelector('.plant').getBoundingClientRect();
    const r = Game.harvest(i);
    if (!r.ok) return;
    if (r.bonus) coinHold++;
    render();
    Sound.play('harvest');
    fly(Art.icon(r.plant), from, el.btnShop, { count: 1, onArrive: () => replay(el.shopBadge, 'bump') });
    fly('<span class="fly-star">⭐</span>', from, el.levelPill, { count: 1, onArrive: () => replay(el.levelPill, 'bump') });
    if (r.bonus) {
      const target = Game.state.coins;
      fly('<span class="coin"></span>', from, el.coinsPill, { count: 2, onArrive: () => { coinHold--; countCoinsTo(target); } });
    }
    floatText(`+1 ${r.plant.name}  ⭐${r.xp}${r.bonus ? `  🪙${r.bonus}` : ''}`, from);
    showFact(r.plant, r.fact);
    if (r.levelUps.length) setTimeout(() => showLevelUps(r.levelUps), 900);
  }

  function noEnergy() {
    Sound.play('soft');
    replay(el.energyPill, 'shake');
    if (mode.type === 'water') setMode({ type: 'none' });
    toast('خلصت طاقة اليوم ⚡ نباتاتك بخير، الطاقة ترجع الصبح 🌅', 3500);
  }

  function doInstallTool(i, toolId) {
    const t = DATA.TOOLS[toolId];
    const r = Game.installTool(i, toolId);
    if (!r.ok) {
      if (r.reason === 'has') toast(`هذا الحوض فيه ${t.name} من قبل ${t.icon}`);
      else setMode({ type: 'none' });
      return;
    }
    setMode({ type: 'none' });
    render();
    if (toolId === 'sprinkler') {
      rain(plotEl(i));
      toast('تم تركيب الرشاش 💦 هذا الحوض يسقي نفسه!', 3000);
    } else if (toolId === 'umbrella') {
      replay(plotEl(i).querySelector('.umbrella'), 'pop');
      toast('ركّبت المظلة ⛱️ هذا الحوض بيعطش نص المرات', 3000);
    } else {
      replay(plotEl(i).querySelector('.net'), 'pop');
      toast('غطّيت النبتة بالشبكة 🥅 العصافير ما بتقدر توقف عليها', 3000);
    }
  }

  function doRemovePest(i) {
    const r = Game.removePest(i);
    if (!r.ok) return;
    const from = plotEl(i).querySelector('.pest').getBoundingClientRect();
    render();
    Sound.play('pop');
    floatText('👋🐛', from);
    replay(plotEl(i).querySelector('.plant'), 'wiggle');
    toast('شلت الدودة 🐛 النبتة رجعت تكبر بسرعتها 💚');
  }

  function doFertilize(i) {
    const r = Game.fertilize(i);
    if (!r.ok) {
      const msg = {
        empty: 'اختر نبتة مزروعة 🌱',
        ready: 'هذه جاهزة للحصاد! ✨',
        done: 'هذه النبتة أخذت سماد من قبل 🧪',
      }[r.reason];
      if (r.reason === 'energy') noEnergy();
      else if (r.reason === 'none') setMode({ type: 'none' });
      else toast(msg);
      return;
    }
    const b = plotEl(i);
    render();
    replay(b.querySelector('.plant'), 'pop');
    floatText('🧪✨', b.querySelector('.plant').getBoundingClientRect());
    toast('🧪 النبتة صارت تكبر أسرع!');
    if (!Game.state.tools.fertilizer) setMode({ type: 'none' });
    else updateModeBanner();
  }

  function doShoo(i) {
    const r = Game.shooBird(i);
    if (!r.ok) return;
    render();
    Sound.play('shoo');
    replay(plotEl(i).querySelector('.plant'), 'wiggle');
    const g = Game.guardProgress();
    if (r.rewards.length) return showGuardRewards(r.rewards);
    toast(`🐦 طيّرت العصفور! (${g.netDone}/${DATA.GUARD.NET_EVERY} للشبكة)`);
  }

  function showGuardRewards(rewards) {
    Sound.play('gift');
    const scare = rewards.includes('scarecrow');
    el.modal.innerHTML = `
      <div class="hero">${scare ? Birds.SCARECROW_ICON : '🥅'}</div>
      <h2>${scare ? 'حصلت على فزاعة!' : 'مكافأة حارس السطح!'}</h2>
      <p>${scare
        ? 'الفزاعة صارت على سطحك، والعصافير ما عادت توقف على النباتات 🎉'
        : `طيّرت ${Game.guardProgress().shooed} عصفوراً، وهذه شبكة حماية تغطي فيها نبتة 🌱`}</p>
      <div class="row">
        ${scare ? '<button class="btn green big" id="rwOk">رائع! 🎉</button>'
          : '<button class="btn green big" id="rwPlace">غطِّ نبتة 🥅</button><button class="btn big" id="rwOk">لاحقاً</button>'}
      </div>`;
    el.modalOverlay.hidden = false;
    $('rwOk').onclick = closeModal;
    if (!scare) $('rwPlace').onclick = () => { closeModal(); setMode({ type: 'place', tool: 'net' }); };
    if (scare) confetti();
  }

  function askUpgrade(i) {
    const t = Game.nextTier(i);
    if (!t) return toast('هذا الحوض في أعلى مستوى ✨');
    if (Game.level() < t.level) return toast(`ترقية ${t.name} تفتح في المستوى ${t.level} 🔒`);
    const enough = Game.state.coins >= t.price;
    el.modal.innerHTML = `
      <div class="hero">${t.icon}</div>
      <h2>ترقية إلى ${t.name}؟</h2>
      <p>كل حصاد من هذا الحوض يعطيك ${Math.round(t.bonus * 100)}% عملات إضافية</p>
      ${enough ? '' : '<p>العملات لا تكفي بعد 🪙</p>'}
      <div class="row">
        <button class="btn gold big" id="upOk" ${enough ? '' : 'disabled'}>رقِّ <i class="coin sm"></i> ${t.price}</button>
        <button class="btn big" id="upNo">لا</button>
      </div>`;
    el.modalOverlay.hidden = false;
    $('upNo').onclick = closeModal;
    $('upOk').onclick = () => {
      const r = Game.upgradePlot(i);
      closeModal();
      if (!r.ok) return;
      render();
      replay(plotEl(i).querySelector('.planter'), 'pop');
      puff(plotEl(i));
      toast(`صار الحوض ${t.name}! ${t.icon}`);
    };
  }

  function showModal(html) {
    el.modal.innerHTML = html;
    el.modalOverlay.hidden = false;
  }

  function closeModal() {
    el.modalOverlay.hidden = true;
    el.modal.innerHTML = '';
    if (levelQueue.length) nextLevelUp();
  }

  /* ---------- الأقفال: النوم، المدرسة، انتهاء وقت اللعب ---------- */

  let lockState = null;

  function refreshLock() {
    const reason = Parent.lockReason(Date.now());
    if (reason === lockState) return;
    lockState = reason;
    el.app.classList.toggle('night', reason === 'sleep');
    el.app.classList.toggle('locked', !!reason);
    Game.setPaused(!!reason);
    Sound.sync();
    if (!reason) {
      el.lockScreen.hidden = true;
      el.lockScreen.innerHTML = '';
      return;
    }
    Game.save();
    if (sheet) closeSheet();
    setMode({ type: 'none' });
    LevelMap.close();
    Kitchen.close();
    Stall.close();
    const t = Parent.lockText(reason);
    const r = Game.restInfo();
    const next = r.nextMs != null ? `<p class="rest-next">🌱 أقرب نبتة تجهز بعد ${fmtLong(r.nextMs)}</p>` : '';
    el.lockScreen.innerHTML = `<div class="lock-card">
      <div class="hero">${t.hero}</div><h2>${t.title}</h2><p>${t.text}</p>${next}
      <button class="btn lock-parent" id="lockParent">⚙️ للأهل</button>
    </div>`;
    el.lockScreen.hidden = false;
    $('lockParent').onclick = () => Parent.open();
  }

  /* ---------- نقطة التوقف: سطحك مرتاح ---------- */

  let wasResting = false;

  function checkRest() {
    if (lockState || Game.isFirstRun() || Parent.panelOpen || Kitchen.isOpen || Stall.isOpen || Tutorial.active) return;
    const r = Game.restInfo();
    if (!r.resting) { wasResting = false; return; }
    if (wasResting || !el.modalOverlay.hidden || sheet || mode.type !== 'none') return;
    wasResting = true;
    let msg = 'ارتاح شوي وارجع نشوف شو كبر! 🌱';
    if (r.outOfEnergy || (r.nextMs != null && r.nextMs > 3 * DATA.HOUR)) msg = 'تعال بكرة نشوف شو كبر! 🌅';
    if (r.outOfEnergy) msg = `خلصت طاقة اليوم ⚡ ${msg}`;
    showModal(`
      <div class="hero">🌱😌</div>
      <h2>سطحك مرتاح الآن</h2>
      <p>${msg}</p>
      ${r.nextMs != null ? `<p class="rest-next">⏳ أقرب نبتة تجهز بعد ${fmtLong(r.nextMs)}</p>` : ''}
      <div class="row"><button class="btn green big" id="restOk">حاضر 👍</button></div>`);
    $('restOk').onclick = closeModal;
  }

  /* ---------- هدايا ثابتة: الحمام الزاجل ومكافأة الدخول ---------- */

  let carrierLeaving = false;

  function giftText(g) {
    const parts = [];
    if (g.coins) parts.push(`<i class="coin sm"></i> ${g.coins} عملة`);
    if (g.seeds) for (const id of Object.keys(g.seeds)) parts.push(`🌱 ${g.seeds[id]} ${g.seeds[id] > 1 ? 'بذور' : 'بذرة'} ${DATA.PLANTS[id].name}`);
    return parts.join(' · ');
  }

  function feedCarrier() {
    const r = Game.feedPigeon();
    if (!r.ok) return;
    const rect = el.carrier.getBoundingClientRect();
    carrierLeaving = true;
    Sound.play('gift');
    floatText('🌾', rect);
    el.carrier.animate([
      { transform: 'translate(0, 0)' },
      { transform: 'translate(0, -10px) rotate(-6deg)', offset: .3 },
      { transform: 'translate(-260px, -320px)' },
    ], { duration: 1400, delay: 500, easing: 'ease-in' }).onfinish = () => { carrierLeaving = false; render(); };
    render();
    showModal(`
      <div class="hero">🕊️💌</div>
      <h2>أطعمت الحمام الزاجل 🌾</h2>
      <p>جاب لك هدية من الجيران:<br><b>${giftText(r.gift)}</b></p>
      <div class="row"><button class="btn green big" id="giftOk">شكراً يا حمامة! 💚</button></div>`);
    $('giftOk').onclick = closeModal;
  }

  function checkLogin() {
    if (lockState || Game.isFirstRun() || Parent.panelOpen || Tutorial.active || !el.modalOverlay.hidden || pendingGrandma) return;
    const r = Game.claimLogin();
    if (!r || !r.reward) return;
    render();
    Sound.play('gift');
    showModal(`
      <div class="hero">🌞</div>
      <h2>أهلاً! هذا يومك رقم ${r.days} على السطح</h2>
      <p>هديتك اليوم:<br><b>${giftText(r.reward)}</b></p>
      <p class="rest-next">طقس اليوم: ${r.weather.icon} ${r.weather.name}، ${r.weather.desc}</p>
      <div class="row"><button class="btn green big" id="loginOk">يلّا! 🌱</button></div>`);
    $('loginOk').onclick = closeModal;
  }

  /* ---------- رسائل عند العودة: الجدّة تسقي عنك ---------- */

  let pendingGrandma = null;

  function showNotices() {
    for (const n of Game.takeNotices()) if (n.type === 'grandma') pendingGrandma = n;
    if (!pendingGrandma || Game.isFirstRun() || !el.modalOverlay.hidden) return;
    const n = pendingGrandma;
    pendingGrandma = null;
    const text = n.watered ? `سقت ${plural(n.watered, 'نبتة', 'نبتتين', 'نباتات')} وكل شي بخير 🌱`
      : n.planted ? 'وكل النباتات بخير 🌱' : 'وتركت لك سلام 💚';
    showModal(`
      <div class="hero">👵💚</div>
      <h2>مرّت الجدّة وسقت سطحك 💚</h2>
      <p>${text}</p>
      <div class="row"><button class="btn green big" id="grandmaOk">شكراً يا جدّة! 💚</button></div>`);
    $('grandmaOk').onclick = closeModal;
  }

  /* ---------- الاحتفال بالمستوى الجديد ---------- */

  const levelQueue = [];
  function showLevelUps(list) {
    levelQueue.push(...list);
    if (el.modalOverlay.hidden) nextLevelUp();
  }

  function unlockLabel(u) {
    if (u.type === 'plant') return [Art.icon(u.plant), `بذور ${u.plant.name}`];
    if (u.type === 'plot') return ['🪴', 'حوض جديد تقدر تشتريه'];
    if (u.type === 'tier') return [u.tier.icon, `ترقية الأحواض: ${u.tier.name}`];
    if (u.type === 'decor') return [u.decor.icon, `زينة: ${u.decor.name}`];
    return [u.tool.icon, u.tool.name];
  }

  function nextLevelUp() {
    const lu = levelQueue.shift();
    if (!lu) return;
    const items = lu.unlocks.map(u => {
      const [ic, label] = unlockLabel(u);
      return `<div class="unlock-item"><span class="u-ic">${ic}</span><span>${label}</span></div>`;
    }).join('');
    el.modal.innerHTML = `<div class="level-modal">
      <div class="hero">🌟</div>
      <h2>المستوى ${lu.level}!</h2>
      <p>${items ? 'فتحت أشياء جديدة:' : 'أحسنت! سطحك يكبر معك 🌱'}</p>
      ${items ? `<div class="unlock-list">${items}</div>` : ''}
      <div class="row">
        <button class="btn green big" id="lvOk">رائع! 🎉</button>
        <button class="btn big" id="lvMap">🗺️ الخريطة</button>
      </div>
    </div>`;
    el.modalOverlay.hidden = false;
    Sound.play('level');
    $('lvOk').onclick = closeModal;
    $('lvMap').onclick = () => { closeModal(); LevelMap.open({ from: lu.level - 1 }); };
    confetti();
  }

  function confetti() {
    const colors = ['#ffc83d', '#4caf50', '#3aa0e8', '#e2574c', '#b48ae0'];
    const w = el.fx.clientWidth, h = el.fx.clientHeight;
    for (let k = 0; k < 36; k++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.background = colors[k % colors.length];
      c.style.left = `${(k / 36) * w}px`;
      el.fx.appendChild(c);
      const drift = ((k * 37) % 80) - 40;
      c.animate([
        { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
        { transform: `translate(${drift}px, ${h + 30}px) rotate(${360 + k * 20}deg)`, opacity: .8 },
      ], { duration: 1800 + (k % 6) * 200, delay: (k % 9) * 60, easing: 'ease-in', fill: 'backwards' }).onfinish = () => c.remove();
    }
  }

  const hasThirsty = () => Game.state.plots.some((p, i) => { const c = Game.cropInfo(i); return c && c.thirsty; });

  /* =====================================================
     الأوضاع (سقاية / زراعة)
     ===================================================== */

  function setMode(m) {
    if (mode.type === 'catPlay' && m.type !== 'catPlay') Cat.stopPlay();
    mode = m;
    el.scene.classList.toggle('mode-water', m.type === 'water');
    el.scene.classList.toggle('mode-plant', m.type === 'plant');
    el.scene.classList.toggle('mode-upgrade', m.type === 'upgrade');
    el.scene.classList.toggle('mode-place', m.type === 'place');
    el.scene.classList.toggle('mode-fertilize', m.type === 'fertilize');
    el.waterBtn.classList.toggle('active', m.type === 'water');
    updateModeBanner();
  }

  function updateModeBanner() {
    if (mode.type === 'none') { el.modeBanner.hidden = true; return; }
    el.modeBanner.hidden = false;
    if (mode.type === 'water') {
      el.modeText.textContent = '💧 اضغط على النبتة العطشانة';
    } else if (mode.type === 'catPlay') {
      el.modeText.textContent = `🧶 اضغط على السطح لترمي الكرة (باقي ${Cat.throwsLeft})`;
    } else if (mode.type === 'upgrade') {
      el.modeText.textContent = '🔨 اختر حوضاً لترقيته';
    } else if (mode.type === 'place') {
      el.modeText.textContent = {
        net: '🥅 اختر نبتة لتغطيها بالشبكة',
        sprinkler: '💦 اختر حوضاً لتركيب الرشاش',
        umbrella: '⛱️ اختر حوضاً لتركيب المظلة',
      }[mode.tool];
    } else if (mode.type === 'fertilize') {
      el.modeText.textContent = `🧪 اختر نبتة لتسميدها (عندك ${Game.state.tools.fertilizer || 0}) ⚡${DATA.TOOLS.fertilizer.energy}`;
    } else {
      const p = DATA.PLANTS[mode.plantId];
      const n = Game.state.seeds[mode.plantId] || 0;
      el.modeText.textContent = `🌱 اضغط على حوض فارغ لزراعة ${p.name} (عندك ${n})`;
    }
  }

  function onWaterBtn() {
    if (mode.type === 'water') return setMode({ type: 'none' });
    if (!hasThirsty()) return toast('كل النباتات مرتوية 💚');
    if (Game.state.energy < DATA.ENERGY_WATER) return noEnergy();
    setMode({ type: 'water' });
  }

  /* =====================================================
     القوائم السفلية
     ===================================================== */

  function openSheet(kind, opts = {}) {
    sheet = { kind, opts };
    if (mode.type !== 'none') setMode({ type: 'none' });
    el.sheetOverlay.hidden = false;
    renderSheet();
    el.sheetBody.scrollTop = 0;
  }

  function closeSheet() {
    sheet = null;
    el.sheetOverlay.hidden = true;
    el.sheetBody.innerHTML = '';
  }

  function renderSheet() {
    const scroll = el.sheetBody.scrollTop;
    if (sheet.kind === 'seeds') renderSeedsSheet();
    else if (sheet.kind === 'shop') renderShopSheet();
    else if (sheet.kind === 'upgrade') renderUpgradeSheet();
    else if (sheet.kind === 'orders') renderOrdersSheet();
    el.sheetBody.scrollTop = scroll;
  }

  // البذور المفتوحة + ما عندك منها + أول بذرة مقفلة (للتشويق)
  function visiblePlants() {
    const s = Game.state;
    const all = DATA.PLANT_ORDER.map(id => DATA.PLANTS[id]);
    const list = all.filter(p => Game.isUnlocked(p) || s.seeds[p.id]);
    const nextLocked = all.find(p => !Game.isUnlocked(p) && !s.seeds[p.id]);
    if (nextLocked) list.push(nextLocked);
    return list;
  }

  function seedCard(p, withPlant) {
    const s = Game.state;
    const owned = s.seeds[p.id] || 0;
    const locked = !Game.isUnlocked(p);
    const status = locked && !owned ? `<div class="lock">🔒 يفتح في المستوى ${p.unlockLevel}</div>`
      : `<div class="owned">${owned ? `عندك ${owned} 🌱` : 'ما عندك بذور'}</div>`;
    return `<div class="item-card ${locked ? 'locked' : ''}">
      <div class="ic">${Art.icon(p)}</div>
      <div class="info">
        <h3>${p.name}</h3>
        <div class="meta">
          <span>⏳ ${fmtLong(p.growMs)}</span>
          <span>تُباع بـ <i class="coin sm"></i> ${p.sellPrice}</span>
          ${p.repeat ? `<span>🔁 يثمر ${p.repeat.harvests} مرات</span>` : ''}
        </div>
        ${status}
      </div>
      <div class="actions">
        ${withPlant ? `<button class="btn green" data-act="plant" data-id="${p.id}" ${owned ? '' : 'disabled'}>ازرع</button>` : ''}
        <button class="btn gold" data-act="buy" data-id="${p.id}" ${!locked && s.coins >= p.seedPrice ? '' : 'disabled'}>اشترِ <i class="coin sm"></i> ${p.seedPrice}</button>
      </div>
    </div>`;
  }

  function renderSeedsSheet() {
    el.sheetTitle.textContent = sheet.opts.targetPlot != null ? 'شو بدك تزرع؟ 🌱' : 'البذور 🌱';
    el.sheetBody.innerHTML = `<div class="card-list">${visiblePlants().map(p => seedCard(p, true)).join('')}</div>`;
  }

  function renderShopSheet() {
    const tab = sheet.opts.tab || (Game.cropCount() ? 'sell' : 'buy');
    sheet.opts.tab = tab;
    el.sheetTitle.textContent = 'المتجر 🏪';
    let body = `<div class="tabs">
      <button class="tab ${tab === 'sell' ? 'on' : ''}" data-act="tab" data-id="sell">🧺 بيع</button>
      <button class="tab ${tab === 'buy' ? 'on' : ''}" data-act="tab" data-id="buy">🌱 بذور</button>
      <button class="tab ${tab === 'tools' ? 'on' : ''}" data-act="tab" data-id="tools">🧰 أدوات</button>
    </div>`;

    if (tab === 'buy') {
      body += `<div class="card-list">${visiblePlants().map(p => seedCard(p, false)).join('')}</div>`;
    } else if (tab === 'tools') {
      body += `<div class="card-list">${DATA.TOOL_ORDER.filter(id => !DATA.TOOLS[id].reward).map(id => toolCard(DATA.TOOLS[id])).join('')}</div>`;
      body += guardCards();
    } else {
      const crops = Game.state.crops;
      const ids = DATA.PLANT_ORDER.filter(id => crops[id]);
      const prods = DATA.RECIPE_ORDER.filter(id => Game.state.products[id]);
      if (!ids.length && !prods.length) {
        body += '<div class="empty-state"><span class="big-emoji">🧺</span>المخزن فارغ<br>احصد نباتاتك لتبيعها هنا</div>';
      } else {
        let total = 0;
        body += '<div class="card-list">' + ids.map(id => {
          const p = DATA.PLANTS[id];
          const n = crops[id];
          const price = Game.sellPriceFor(id);
          total += n * price;
          return `<div class="item-card">
            <div class="ic">${Art.icon(p)}</div>
            <div class="info">
              <h3>${p.name} × ${n}</h3>
              <div class="meta"><span>الواحدة بـ <i class="coin sm"></i> ${price}</span></div>
            </div>
            <div class="actions">
              <button class="btn gold" data-act="sell1" data-id="${id}">بيع واحدة</button>
            </div>
          </div>`;
        }).join('') + prods.map(id => {
          const rc = DATA.RECIPES[id];
          const n = Game.state.products[id];
          total += n * rc.price;
          return `<div class="item-card">
            <div class="ic emoji">${rc.icon}</div>
            <div class="info">
              <h3>${rc.name} × ${n}</h3>
              <div class="meta"><span>الواحدة بـ <i class="coin sm"></i> ${rc.price}</span></div>
            </div>
            <div class="actions">
              <button class="btn gold" data-act="sellProd1" data-id="${id}">بيع واحدة</button>
            </div>
          </div>`;
        }).join('') + '</div>';
        body += `<div class="sell-all-row"><button class="btn green big" data-act="sellAll">بيع الكل <i class="coin sm"></i> ${total}</button></div>`;
      }
    }
    el.sheetBody.innerHTML = body;
  }

  function guardCards() {
    const s = Game.state;
    const g = Game.guardProgress();
    const nets = s.tools.net || 0;
    const G = DATA.GUARD;
    const meter = (done, total) => `<span class="meter guard-meter"><span class="meter-fill xp" style="width:${Math.round((done / total) * 100)}%"></span></span>`;
    return `<h3 class="section-title">🐦 مكافآت حارس السطح</h3>
    <div class="card-list">
      <div class="item-card">
        <div class="ic emoji">🥅</div>
        <div class="info">
          <h3>شبكة حماية</h3>
          <div class="desc">طيّر ${G.NET_EVERY} عصافير عن نباتاتك وخذ شبكة</div>
          ${meter(g.netDone, G.NET_EVERY)}
          <div class="owned">${g.netDone}/${G.NET_EVERY}${nets ? ` · عندك ${nets}` : ''}</div>
        </div>
        <div class="actions">
          ${nets ? '<button class="btn green" data-act="placeTool" data-id="net">غطِّ نبتة</button>' : ''}
        </div>
      </div>
      <div class="item-card ${s.scarecrow ? '' : 'locked-soft'}">
        <div class="ic emoji">${Birds.SCARECROW_ICON}</div>
        <div class="info">
          <h3>فزاعة</h3>
          <div class="desc">${s.scarecrow ? 'تحرس سطحك كله من العصافير ✅' : `طيّر ${G.SCARECROW_AT} عصفوراً وتحرس الفزاعة سطحك كله`}</div>
          ${s.scarecrow ? '' : meter(Math.min(g.shooed, G.SCARECROW_AT), G.SCARECROW_AT)}
          ${s.scarecrow ? '' : `<div class="owned">${Math.min(g.shooed, G.SCARECROW_AT)}/${G.SCARECROW_AT}</div>`}
        </div>
      </div>
    </div>`;
  }

  function toolCard(t) {
    const s = Game.state;
    const owned = s.tools[t.id] || 0;
    const locked = Game.level() < t.level;
    return `<div class="item-card ${locked ? 'locked' : ''}">
      <div class="ic emoji">${t.icon}</div>
      <div class="info">
        <h3>${t.name}</h3>
        <div class="desc">${t.desc}</div>
        ${locked ? `<div class="lock">🔒 يفتح في المستوى ${t.level}</div>` : owned ? `<div class="owned">عندك ${owned}</div>` : ''}
      </div>
      <div class="actions">
        ${owned ? `<button class="btn green" data-act="${t.use ? 'useTool' : 'placeTool'}" data-id="${t.id}">${t.use ? 'استعمله' : 'ركّبه'}</button>` : ''}
        <button class="btn gold" data-act="buyTool" data-id="${t.id}" ${!locked && s.coins >= t.price ? '' : 'disabled'}>اشترِ <i class="coin sm"></i> ${t.price}</button>
      </div>
    </div>`;
  }

  function renderOrdersSheet() {
    el.sheetTitle.textContent = 'طلبات الجيران 📋';
    const s = Game.state;
    el.sheetBody.innerHTML = '<p class="sheet-note">الجيران بيدفعوا ضعف السعر! والطلبات بتستناك، ما في استعجال 💚</p><div class="card-list">' +
      s.orders.map((o, k) => {
        const n = DATA.ORDERS.NEIGHBORS[o.who];
        const p = DATA.PLANTS[o.plantId];
        if (o.done) {
          return `<div class="item-card order done">
            <div class="ic emoji">${n.icon}</div>
            <div class="info"><h3>${n.name}</h3><div class="desc">✅ شكراً! ${n.she ? 'مبسوطة' : 'مبسوط'} كثير 💚<br>طلب جديد بكرة</div></div>
          </div>`;
        }
        const have = s.crops[o.plantId] || 0;
        const ok = Game.canFulfill(o);
        return `<div class="item-card order">
          <div class="ic emoji">${n.icon}</div>
          <div class="info">
            <h3>${n.name}</h3>
            <div class="order-want"><span class="mini-ic">${Art.icon(p)}</span>${n.she ? 'بدها' : 'بدّه'} ${o.qty} ${p.name}</div>
            <div class="meta"><span>عندك ${Math.min(have, o.qty)}/${o.qty}</span><span>المكافأة <i class="coin sm"></i> ${Game.orderReward(o)}</span></div>
          </div>
          <div class="actions"><button class="btn green" data-act="fulfill" data-id="${k}" ${ok ? '' : 'disabled'}>سلّم</button></div>
        </div>`;
      }).join('') + '</div>';
  }

  function renderUpgradeSheet() {
    el.sheetTitle.textContent = 'الترقيات 🔨';
    const lvl = Game.level();
    const np = Game.nextPlot();
    let body = '<h3 class="section-title">🪴 أحواض جديدة</h3>';
    if (!np) {
      body += '<div class="empty-state">سطحك فيه 16 حوضاً، أكبر سطح! 🎉</div>';
    } else {
      body += `<div class="card-list"><div class="item-card ${np.levelOk ? '' : 'locked'}">
        <div class="ic emoji">🪴</div>
        <div class="info">
          <h3>حوض رقم ${np.number}</h3>
          <div class="desc">مكان جديد لنبتة إضافية</div>
          ${np.levelOk ? '' : `<div class="lock">🔒 يفتح في المستوى ${np.level}</div>`}
        </div>
        <div class="actions">
          <button class="btn gold" data-act="unlockPlot" ${np.levelOk && np.coinsOk ? '' : 'disabled'}>افتحه <i class="coin sm"></i> ${np.price}</button>
        </div>
      </div></div>`;
    }

    body += '<h3 class="section-title">🏺 ترقية الأحواض</h3><div class="tier-row">';
    body += DATA.TIER_ORDER.map(id => {
      const t = DATA.TIERS[id];
      const locked = lvl < t.level;
      const sub = !t.price ? 'العادي' : locked ? `🔒 مستوى ${t.level}` : `<i class="coin sm"></i> ${t.price}`;
      return `<div class="tier-chip ${locked ? 'locked' : ''}">
        <span class="t-icon">${t.icon}</span><b>${t.name}</b>
        ${t.bonus ? `+${Math.round(t.bonus * 100)}% عملات` : 'بدون مكافأة'}<br>${sub}
      </div>`;
    }).join('') + '</div>';
    const firstUp = DATA.TIERS[DATA.TIER_ORDER[1]];
    const canPick = lvl >= firstUp.level;
    body += `<div class="btn-row"><button class="btn green big" data-act="upgradeMode" ${canPick ? '' : 'disabled'}>
      ${canPick ? '🔨 اختر حوضاً لترقيته' : `🔒 الترقية تفتح في المستوى ${firstUp.level}`}</button></div>`;
    body += decorCards();
    el.sheetBody.innerHTML = body;
  }

  function decorCards() {
    const s = Game.state;
    const items = DATA.DECOR_ORDER.map(id => DATA.DECOR[id]);
    const shop = items.filter(d => !d.challenge && !(d.id in s.decor) && Game.decorUnlocked(d));
    const next = items.find(d => !d.challenge && !Game.decorUnlocked(d));
    const owned = items.filter(d => d.id in s.decor);
    const ch = Game.currentChallenge();
    let html = '<h3 class="section-title">🏮 زينة السطح</h3>';
    if (ch) {
      const prize = DATA.DECOR[ch.decor];
      html += `<div class="item-card challenge-card">
        <div class="ic emoji">${prize.icon}</div>
        <div class="info">
          <h3>تحدي الأسبوع 🌍</h3>
          <div class="desc">${ch.text}. لما تخلّصه، خلّي أهلك يأكدوه من ⚙️ وخذ ${prize.name}</div>
        </div>
      </div>`;
    }
    html += '<div class="card-list decor-list">';
    html += [...shop, ...(next ? [next] : []), ...owned].map(d => {
      const has = d.id in s.decor;
      const locked = !has && !Game.decorUnlocked(d);
      const action = has
        ? `<button class="btn" data-act="toggleDecor" data-id="${d.id}">${s.decor[d.id] ? 'إخفاء' : 'إظهار'}</button>`
        : `<button class="btn gold" data-act="buyDecor" data-id="${d.id}" ${!locked && s.coins >= d.price ? '' : 'disabled'}>اشترِ <i class="coin sm"></i> ${d.price}</button>`;
      return `<div class="item-card ${locked ? 'locked' : ''}">
        <div class="ic emoji">${d.icon}</div>
        <div class="info">
          <h3>${d.name}</h3>
          ${locked ? `<div class="lock">🔒 تفتح في المستوى ${d.level}</div>` : has ? '<div class="owned">على سطحك ✅</div>' : ''}
        </div>
        <div class="actions">${action}</div>
      </div>`;
    }).join('');
    return `${html}</div>`;
  }

  function onSheetClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const id = t.dataset.id;
    switch (t.dataset.act) {
      case 'tab':
        sheet.opts.tab = id;
        renderSheet();
        break;
      case 'buy': {
        const r = Game.buySeed(id);
        if (r.ok) {
          setCoins(Game.state.coins);
          replay(el.coinsPill, 'bump');
          toast(`اشتريت بذرة ${DATA.PLANTS[id].name} 🌱`);
          render();
        } else if (r.reason === 'coins') {
          toast('العملات لا تكفي، احصد وبِع أولاً 🧺');
        }
        break;
      }
      case 'plant': {
        const target = sheet.opts.targetPlot;
        closeSheet();
        if (target != null && !Game.state.plots[target].crop) doPlant(target, id);
        else setMode({ type: 'plant', plantId: id });
        break;
      }
      case 'buyTool': {
        const r = Game.buyTool(id);
        if (r.ok) {
          setCoins(Game.state.coins);
          replay(el.coinsPill, 'bump');
          toast(`اشتريت ${DATA.TOOLS[id].name} ${DATA.TOOLS[id].icon}`);
          render();
        }
        break;
      }
      case 'useTool':
        closeSheet();
        setMode({ type: 'fertilize' });
        break;
      case 'fulfill': {
        const k = Number(id);
        const o = Game.state.orders[k];
        const n = DATA.ORDERS.NEIGHBORS[o.who];
        doSell(t, () => Game.fulfillOrder(k));
        if (o.done) toast(`${n.icon} شكراً! ${n.name} ${n.she ? 'مبسوطة' : 'مبسوط'} كثير 💚`, 3000);
        break;
      }
      case 'placeTool':
        closeSheet();
        setMode({ type: 'place', tool: id });
        break;
      case 'unlockPlot': {
        const r = Game.unlockPlot();
        if (!r.ok) break;
        closeSheet();
        buildPlots();
        render();
        replay(plotEl(r.index), 'pop');
        puff(plotEl(r.index));
        toast('حوض جديد على سطحك! 🪴');
        break;
      }
      case 'upgradeMode':
        closeSheet();
        setMode({ type: 'upgrade' });
        break;
      case 'buyDecor': {
        const r = Game.buyDecor(id);
        if (r.ok) {
          setCoins(Game.state.coins);
          replay(el.coinsPill, 'bump');
          Sound.play('gift');
          toast(`صارت ${r.decor.name} على سطحك ${r.decor.icon}`);
          render();
        }
        break;
      }
      case 'toggleDecor':
        Game.toggleDecor(id);
        render();
        break;
      case 'sellProd1':
        doSell(t, () => Game.sellProduct(id, 1));
        break;
      case 'sell1':
        doSell(t, () => Game.sell(id, 1));
        break;
      case 'sellAll':
        doSell(t, () => Game.sellAll());
        break;
    }
  }

  function doSell(btn, action) {
    const from = btn.getBoundingClientRect();
    const r = action();
    if (!r.ok) return;
    coinFx(from, r.coins);
    render();
  }

  // طيران العملات إلى العداد بعد أي بيع
  function coinFx(from, coins) {
    coinHold++;
    const target = Game.state.coins;
    fly('<span class="coin"></span>', from, el.coinsPill, {
      count: Math.min(8, Math.max(3, Math.round(coins / 15))),
      onArrive: () => { coinHold--; countCoinsTo(target); },
    });
    floatText(`+${coins}`, from);
  }

  /* =====================================================
     النوافذ: الترحيب واسم السطح
     ===================================================== */

  function openNameModal(first) {
    const current = Game.state.roofName;
    el.modal.innerHTML = `
      <div class="hero">${first ? '🏠🌱' : '🪧'}</div>
      <h2>${first ? 'أهلاً بك في سطحي الأخضر!' : 'اسم السطح'}</h2>
      <p>${first ? 'شو اسم سطحك؟' : 'اكتب اسماً جديداً لسطحك'}</p>
      <input id="nameInput" type="text" maxlength="${DATA.MAX_ROOF_NAME}" placeholder="مثلاً: سطح زياد وميرنا" value="${first ? '' : escapeHtml(current)}" autocomplete="off">
      <div class="row">
        <button class="btn green big" id="nameOk">${first ? 'يلّا نبدأ 🌱' : 'حفظ'}</button>
        ${first ? '' : '<button class="btn big" id="nameCancel">إلغاء</button>'}
      </div>`;
    el.modalOverlay.hidden = false;
    const input = $('nameInput');
    const done = () => {
      Game.setRoofName(input.value);
      el.modalOverlay.hidden = true;
      render();
    };
    $('nameOk').onclick = done;
    input.onkeydown = e => { if (e.key === 'Enter') done(); };
    if (!first) $('nameCancel').onclick = () => { el.modalOverlay.hidden = true; };
    setTimeout(() => input.focus(), 250);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* =====================================================
     التنبيهات والمعلومات
     ===================================================== */

  function toast(text, ms = 2400) {
    el.toast.textContent = text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  function showFact(p, fact) {
    el.factCard.innerHTML = `<div class="fact-icon">${Art.icon(p)}</div>
      <div><h3>حصدت ${p.name}! 🧺</h3><p>${fact}</p></div>`;
    el.factCard.classList.add('show');
    clearTimeout(factTimer);
    factTimer = setTimeout(hideFact, 5500);
  }
  function hideFact() { el.factCard.classList.remove('show'); }

  /* =====================================================
     المؤثرات
     ===================================================== */

  function fxPoint(rect) {
    const f = el.fx.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - f.left, y: rect.top + rect.height / 2 - f.top };
  }

  function fly(html, fromRect, toEl, { count = 1, onArrive } = {}) {
    const a = fxPoint(fromRect);
    const b = fxPoint(toEl.getBoundingClientRect());
    let arrived = 0;
    for (let k = 0; k < count; k++) {
      const node = document.createElement('div');
      node.className = 'fly';
      node.innerHTML = html;
      el.fx.appendChild(node);
      const jx = (k - (count - 1) / 2) * 14;
      const midX = (a.x + b.x) / 2 + jx;
      const midY = Math.min(a.y, b.y) - 60;
      const anim = node.animate([
        { transform: `translate(${a.x - 17}px, ${a.y - 17}px) scale(.6)`, opacity: 0 },
        { transform: `translate(${a.x - 17 + jx}px, ${a.y - 37}px) scale(1.1)`, opacity: 1, offset: .2 },
        { transform: `translate(${midX - 17}px, ${midY - 17}px) scale(1)`, opacity: 1, offset: .55 },
        { transform: `translate(${b.x - 17}px, ${b.y - 17}px) scale(.7)`, opacity: .9 },
      ], { duration: 750, delay: k * 70, easing: 'ease-in-out', fill: 'backwards' });
      anim.onfinish = () => {
        node.remove();
        if (++arrived === count && onArrive) onArrive();
      };
    }
  }

  function floatText(text, rect) {
    const p = fxPoint(rect);
    const node = document.createElement('div');
    node.className = 'fly-text';
    node.textContent = text;
    el.fx.appendChild(node);
    node.animate([
      { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, 0)`, opacity: 0 },
      { transform: `translate(${p.x}px, ${p.y - 20}px) translate(-50%, 0)`, opacity: 1, offset: .2 },
      { transform: `translate(${p.x}px, ${p.y - 60}px) translate(-50%, 0)`, opacity: 0 },
    ], { duration: 1100, easing: 'ease-out' }).onfinish = () => node.remove();
  }

  function rain(plot) {
    const r = plot.querySelector('.plant').getBoundingClientRect();
    const p = fxPoint(r);
    for (let k = 0; k < 9; k++) {
      const d = document.createElement('div');
      d.className = 'drop';
      el.fx.appendChild(d);
      const x = p.x - 30 + (k % 5) * 15 + (k > 4 ? 7 : 0);
      d.animate([
        { transform: `translate(${x}px, ${p.y - 60}px)`, opacity: 0 },
        { transform: `translate(${x}px, ${p.y - 40}px)`, opacity: 1, offset: .2 },
        { transform: `translate(${x}px, ${p.y + 34}px) scaleY(.6)`, opacity: 0 },
      ], { duration: 600, delay: k * 50, easing: 'ease-in', fill: 'backwards' }).onfinish = () => d.remove();
    }
  }

  function puff(plot) {
    const p = fxPoint(plot.querySelector('.soil').getBoundingClientRect());
    for (let k = 0; k < 6; k++) {
      const d = document.createElement('div');
      d.className = 'puff';
      el.fx.appendChild(d);
      const ang = Math.PI + (k / 5) * Math.PI;
      const dx = Math.cos(ang) * 30, dy = Math.sin(ang) * 22;
      d.animate([
        { transform: `translate(${p.x - 6}px, ${p.y - 6}px) scale(1)`, opacity: .9 },
        { transform: `translate(${p.x - 6 + dx}px, ${p.y - 6 + dy}px) scale(.3)`, opacity: 0 },
      ], { duration: 500, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  /* الحمام الزاجل يطير أحياناً (للزينة فقط) */
  const PIGEON_SVG = `<svg viewBox="0 0 46 30" width="46" height="30">
    <ellipse cx="24" cy="17" rx="13" ry="7" fill="#9aa5b8"/>
    <path d="M36 15 L45 11 L44 19Z" fill="#7d889c"/>
    <circle cx="11" cy="13" r="6" fill="#aab4c6"/>
    <path d="M5 13 L1 15 L5 15.5Z" fill="#f2a65a"/>
    <circle cx="9.5" cy="12" r="1.3" fill="#1f2937"/>
    <path d="M11 17 Q13 20 16 18" stroke="#6fb3a0" stroke-width="2" fill="none"/>
    <path class="wing" d="M18 14 Q26 -2 34 12Z" fill="#c7cfdb"/>
  </svg>`;

  function schedulePigeon() {
    setTimeout(() => {
      if (!document.hidden) {
        const lane = el.pigeonLane;
        const node = document.createElement('div');
        node.className = 'pigeon';
        node.innerHTML = PIGEON_SVG;
        node.style.top = `${15 + Math.random() * 30}%`;
        node.style.right = '-50px';
        node.style.setProperty('--fly-dist', `${lane.clientWidth + 100}px`);
        lane.appendChild(node);
        setTimeout(() => node.remove(), 9500);
      }
      schedulePigeon();
    }, 25000 + Math.random() * 35000);
  }

  /* =====================================================
     التشغيل
     ===================================================== */

  function bind() {
    ['scene', 'plots', 'coinCount', 'coinsPill', 'roofName', 'roofSign', 'waterBtn', 'modeBanner', 'modeText', 'modeClose',
      'toast', 'factCard', 'btnShop', 'btnSeeds', 'btnUpgrade', 'shopBadge', 'sheetOverlay', 'sheetTitle', 'sheetBody',
      'sheetClose', 'modalOverlay', 'modal', 'fx', 'pigeonLane', 'levelPill', 'levelNum', 'xpFill', 'energyPill',
      'energyText', 'energyFill', 'upgradeBadge', 'scarecrow', 'mapBtn', 'birdLayer', 'app', 'lockScreen',
      'weatherChip', 'boardBtn', 'boardBadge', 'carrier', 'btnKitchen', 'btnStall', 'kitchenBadge', 'decorLayer'].forEach(id => { el[id] = $(id); });

    el.plots.addEventListener('click', e => {
      const b = e.target.closest('.plot');
      if (b) onPlotTap(Number(b.dataset.i));
    });
    el.waterBtn.onclick = onWaterBtn;
    el.modeClose.onclick = () => setMode({ type: 'none' });
    el.btnSeeds.onclick = () => openSheet('seeds');
    el.btnShop.onclick = () => openSheet('shop');
    el.btnUpgrade.onclick = () => openSheet('upgrade');
    el.btnKitchen.onclick = () => { setMode({ type: 'none' }); Kitchen.show(); };
    el.btnStall.onclick = () => { setMode({ type: 'none' }); Stall.show(); };
    el.sheetClose.onclick = closeSheet;
    el.sheetOverlay.addEventListener('click', e => { if (e.target === el.sheetOverlay) closeSheet(); });
    el.sheetBody.addEventListener('click', onSheetClick);
    el.roofSign.onclick = () => openNameModal(false);
    el.factCard.onclick = hideFact;
    el.levelPill.onclick = () => LevelMap.open();
    el.mapBtn.onclick = () => LevelMap.open();
    el.energyPill.onclick = () => toast(`الطاقة ${Game.state.energy}/${DATA.ENERGY_MAX} ⚡ تتجدد كل صباح الساعة ${DATA.ENERGY_RESET_HOUR} 🌅`, 3000);
    window.addEventListener('resize', layoutPlots);
    Game.on('sprinkled', i => setTimeout(() => { if (!document.hidden && plotEl(i)) rain(plotEl(i)); }, 50));
    Game.on('rained', i => setTimeout(() => { if (!document.hidden && plotEl(i)) rain(plotEl(i)); }, 50));
    el.weatherChip.onclick = () => { const w = Game.weather; toast(`${w.icon} اليوم ${w.name}: ${w.desc}`, 3000); };
    el.boardBtn.onclick = () => openSheet('orders');
    el.carrier.onclick = feedCarrier;
  }

  function tick() {
    const now = Date.now();
    Game.tick(now);
    refreshLock();
    Parent.track(now, !!lockState);
    refreshLock(); // الوقت المحسوب للتو قد يُنهي وقت اللعب
    if (!lockState && Parent.shouldWarn(now)) toast('باقي دقيقتين للعب اليوم ⏳ سطحك بينحفظ لحاله', 4500);
    showNotices();
    checkLogin();
    checkRest();
    render();
  }

  function start() {
    Game.init();
    bind();
    buildPlots();
    setCoins(Game.state.coins);
    render();
    Parent.init();

    refreshLock();
    if (Game.isFirstRun()) openNameModal(true);
    else showNotices();

    setInterval(tick, 1000);
    setInterval(() => Game.saveIfDirty(), 10000);

    // عند العودة للعبة نحسب الوقت المنقضي فوراً، وعند الخروج نحفظ
    document.addEventListener('visibilitychange', () => {
      Game.tick(Date.now());
      if (document.hidden) Game.save();
      else tick();
    });
    window.addEventListener('pagehide', () => { Game.tick(Date.now()); Game.save(); });

    schedulePigeon();
    Birds.init();
    Kitchen.init();
    Stall.init();
    Cat.init();
    Sound.init();
    Tutorial.init();

    // تشغيل اللعبة بدون إنترنت وتثبيتها على الشاشة الرئيسية
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  return {
    start, render, toast, Art, unlockLabel, plotEl, fxPoint, el, confetti,
    showModal, closeModal, replay, escapeHtml, refreshLock, fly, floatText, coinFx, setMode, updateModeBanner,
  };
})();

/* أدوات للمطوّر فقط (من الـ Console) لتجربة مرور الوقت دون انتظار:
   RooftopDev.away(60)   ← كأن اللعبة كانت مغلقة 60 دقيقة
   RooftopDev.reset()    ← حذف الحفظ والبدء من جديد */
window.RooftopDev = {
  away(minutes) {
    Game.state.lastSeen -= minutes * DATA.MIN;
    Game.tick(Date.now());
    Game.save();
    UI.render();
  },
  reset() {
    Game.stopSaving();
    SaveStore.clear();
    location.reload();
  },
};

document.addEventListener('DOMContentLoaded', UI.start);
