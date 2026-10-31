'use strict';
/* =========================================================
   data.js — بيانات اللعبة: النباتات والأسعار والمستويات والإعدادات العامة
   ---------------------------------------------------------
   لاستبدال الرسومات المؤقتة بصور PNG:
   1) ضع مسار صورة كل مرحلة في images.stages (4 صور: بذرة، صغيرة، مزهرة، جاهزة)
      ومسار الأيقونة في images.icon
   2) غيّر ART.useImages إلى true
   ========================================================= */

const DATA = (() => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  const imagesFor = id => ({
    icon: `assets/plants/${id}/icon.png`,
    stages: [0, 1, 2, 3].map(n => `assets/plants/${id}/${n}.png`),
  });

  // look: ألوان الرسم المؤقت. fruitShape: round | long | oval. leafScale: حجم الورق
  const PLANTS = {
    mint: {
      id: 'mint',
      name: 'نعناع',
      seedPrice: 5,
      growMs: 10 * MIN,
      sellPrice: 12,
      xp: 2,
      unlockLevel: 1,
      repeat: null, // للنباتات المتكررة: { harvests: عدد مرات الحصاد الكلي }
      look: { leaf: '#5cc96b', leaf2: '#3faa55', edge: '#2e7d3e', stem: '#4a9a4a', flower: '#c9a6f0', fruit: null, shape: 'pointy' },
      images: imagesFor('mint'),
      facts: [
        'النعناع يحب الماء كثيراً ويكبر بسرعة 💧',
        'ورق النعناع يعطي الشاي رائحة منعشة 🍵',
        'النعناع ينتشر بسرعة، لذلك نزرعه في أصيص لوحده 🪴',
        'إذا قطفنا أطراف النعناع ينمو أكثر وأكثر ✂️',
      ],
    },
    basil: {
      id: 'basil',
      name: 'ريحان',
      seedPrice: 8,
      growMs: 20 * MIN,
      sellPrice: 20,
      xp: 3,
      unlockLevel: 1,
      repeat: null,
      look: { leaf: '#48b05c', leaf2: '#2f8f47', edge: '#226b36', stem: '#3d8a45', flower: '#ffffff', fruit: null, shape: 'round' },
      images: imagesFor('basil'),
      facts: [
        'الريحان يحب الشمس الدافئة ☀️',
        'إذا قطفنا رأس الريحان يصير أكثف وأجمل 🌿',
        'رائحة الريحان الطيبة تُبعد بعض الحشرات 🐜',
        'الريحان لا يحب البرد، يحب الأيام الدافئة 🌤️',
      ],
    },
    tomato: {
      id: 'tomato',
      name: 'بندورة',
      seedPrice: 15,
      growMs: 1 * HOUR,
      sellPrice: 45,
      xp: 6,
      unlockLevel: 2,
      repeat: null,
      look: { leaf: '#58a845', leaf2: '#3e8a34', edge: '#2d6a27', stem: '#4f8f3a', flower: '#ffd23f', fruit: '#e8432e', fruitShape: 'round', shape: 'pointy' },
      images: imagesFor('tomato'),
      facts: [
        'البندورة تحب الشمس 6 ساعات يومياً ☀️',
        'حبة البندورة تبدأ خضراء ثم تحمرّ عندما تنضج 🍅',
        'نسقي البندورة عند جذورها وليس على أوراقها 💧',
        'البندورة تحتاج عصا تستند عليها عندما تكبر 🪵',
      ],
    },
    pepper: {
      id: 'pepper',
      name: 'فلفل حار',
      seedPrice: 25,
      growMs: 3 * HOUR,
      sellPrice: 90,
      xp: 12,
      unlockLevel: 4,
      repeat: null,
      look: { leaf: '#5aa84a', leaf2: '#3f8a37', edge: '#2d6a27', stem: '#4f8f3a', flower: '#ffffff', fruit: '#e3342f', fruitShape: 'long', shape: 'pointy' },
      images: imagesFor('pepper'),
      facts: [
        'الفلفل الحار يحب الحرّ والشمس القوية 🌶️',
        'كلما احمرّ الفلفل صار أحرّ وأطيب 🔥',
        'لا نفرك عيوننا بعد لمس الفلفل الحار! 👀',
        'الفلفل يعطي ثماراً كثيرة من نبتة واحدة 🌿',
      ],
    },
    eggplant: {
      id: 'eggplant',
      name: 'باذنجان',
      seedPrice: 40,
      growMs: 6 * HOUR,
      sellPrice: 160,
      xp: 20,
      unlockLevel: 6,
      repeat: null,
      look: { leaf: '#6aab5a', leaf2: '#4f8f45', edge: '#3a6e33', stem: '#5b7f45', flower: '#b48ae0', fruit: '#5b2a86', fruitShape: 'long', shape: 'round' },
      images: imagesFor('eggplant'),
      facts: [
        'زهرة الباذنجان بنفسجية مثل ثمرته 💜',
        'الباذنجان يحب الدفء والماء المنتظم 💧',
        'من الباذنجان نعمل البابا غنوج والمقلوبة 🍆',
        'نقطف الباذنجان وقشرته لامعة وناعمة ✨',
      ],
    },
    thyme: {
      id: 'thyme',
      name: 'زعتر',
      seedPrice: 60,
      growMs: 12 * HOUR,
      sellPrice: 260,
      xp: 35,
      unlockLevel: 8,
      repeat: null,
      look: { leaf: '#7fae6a', leaf2: '#5f9150', edge: '#41683a', stem: '#6b7f4a', flower: '#f3b6d8', fruit: null, shape: 'pointy', leafScale: .75 },
      images: imagesFor('thyme'),
      facts: [
        'الزعتر لا يحب الماء الكثير، يحب التربة الجافة قليلاً ☀️',
        'من الزعتر المجفف نعمل الزعتر للفطور 🫓',
        'النحل يحب زهور الزعتر الصغيرة 🐝',
        'الزعتر ينبت في الجبال بين الصخور ⛰️',
      ],
    },
    sage: {
      id: 'sage',
      name: 'ميرمية',
      seedPrice: 70,
      growMs: 12 * HOUR,
      sellPrice: 300,
      xp: 40,
      unlockLevel: 10,
      repeat: null,
      look: { leaf: '#9db89a', leaf2: '#7f9e7c', edge: '#557055', stem: '#6f8a66', flower: '#9b7fe0', fruit: null, shape: 'round' },
      images: imagesFor('sage'),
      facts: [
        'ورق الميرمية ناعم كأنه مغطى بالمخمل 🍃',
        'الميرمية مع الشاي مشروب دافئ في الشتاء 🍵',
        'الميرمية تتحمل العطش أكثر من نباتات كثيرة 💪',
        'زهور الميرمية بنفسجية يحبها النحل 🐝',
      ],
    },
    lemon: {
      id: 'lemon',
      name: 'ليمون',
      seedPrice: 300,
      growMs: 24 * HOUR,
      sellPrice: 150,
      xp: 30,
      unlockLevel: 12,
      repeat: { harvests: 5 }, // يثمر كل 24 ساعة، 5 مرات
      look: { leaf: '#3f9a4a', leaf2: '#2e7d3a', edge: '#215c2b', stem: '#7a5230', flower: '#ffffff', fruit: '#ffd93b', fruitShape: 'oval', shape: 'round' },
      images: imagesFor('lemon'),
      facts: [
        'شجرة الليمون تعطي ثماراً مرة بعد مرة 🍋',
        'زهر الليمون أبيض ورائحته جميلة جداً 🤍',
        'الليمون يحب الشمس ولا يحب الصقيع ❄️',
        'عصير الليمون مع النعناع اسمه ليموناضة 🥤',
      ],
    },
  };

  return {
    SAVE_KEY: 'rooftop_save_v1',
    SAVE_VERSION: 6,

    MIN, HOUR, DAY,

    // بداية اللعبة
    START_COINS: 100,
    START_SEEDS: { mint: 3 },
    START_PLOTS: 6,
    MAX_PLOTS: 16,
    DEFAULT_ROOF_NAME: 'سطحي الأخضر',
    MAX_ROOF_NAME: 24,

    // الطاقة اليومية: تتجدد بالكامل مرة واحدة كل صباح، ولا تُشترى أبداً
    ENERGY_MAX: 30,
    ENERGY_RESET_HOUR: 6,
    ENERGY_WATER: 1,

    // السقاية: مرة كل ربع مدة النمو تقريباً، بحد أدنى 10 دقائق
    WATER_FRACTION: 0.25,
    MIN_WATER_INTERVAL: 10 * MIN,

    // الوقت
    MAX_CATCHUP: 7 * DAY,     // أقصى قفزة زمنية تُحسب دفعة واحدة
    AWAY_THRESHOLD: 2 * MIN,  // فجوة أطول من هذا = الطفل كان غائباً (التربة تحفظ الرطوبة)

    // حدود المراحل (نسبة من مدة النمو)
    STAGE_SPROUT: 0.25,
    STAGE_FLOWER: 0.6,

    // المستويات: الخبرة المطلوبة للانتقال من المستوى L إلى L+1
    xpToNext: L => Math.round(10 * Math.pow(L, 1.5)),

    // الأحواض الإضافية (من الحوض 7 إلى 16): المستوى المطلوب والسعر
    PLOT_UNLOCKS: [
      { level: 3, price: 100 },
      { level: 4, price: 160 },
      { level: 5, price: 240 },
      { level: 7, price: 340 },
      { level: 8, price: 460 },
      { level: 10, price: 600 },
      { level: 11, price: 760 },
      { level: 12, price: 940 },
      { level: 13, price: 1150 },
      { level: 14, price: 1400 },
    ],

    // أنواع الأحواض: المكافأة تُضاف على سعر البيع عند الحصاد
    TIERS: {
      wood: { id: 'wood', name: 'خشب', bonus: 0, price: 0, level: 1, icon: '🪵' },
      clay: { id: 'clay', name: 'فخار', bonus: 0.2, price: 80, level: 5, icon: '🏺' },
      deco: { id: 'deco', name: 'مزخرف', bonus: 0.4, price: 250, level: 9, icon: '💠' },
    },
    TIER_ORDER: ['wood', 'clay', 'deco'],

    // الأدوات (السماد والمظلة تأتي مع المرحلة 4)
    TOOLS: {
      sprinkler: { id: 'sprinkler', name: 'رشاش ماء آلي', desc: 'تركّبه على حوض، فيسقيه لوحده دائماً', price: 200, level: 3, icon: '💦' },
      umbrella: { id: 'umbrella', name: 'مظلة', desc: 'تركّبها على حوض، فيعطش نص المرات', price: 120, level: 5, icon: '⛱️' },
      fertilizer: { id: 'fertilizer', name: 'سماد', desc: 'يسرّع النمو الباقي 25% (مرة لكل نبتة)', price: 30, level: 2, icon: '🧪', use: true, energy: 2, boost: 0.25 },
      // الشبكة لا تُشترى: مكافأة لطرد العصافير
      net: { id: 'net', name: 'شبكة حماية', desc: 'تغطي نبتة فلا تقف عليها العصافير', reward: true, level: 1, icon: '🥅' },
    },
    TOOL_ORDER: ['fertilizer', 'sprinkler', 'umbrella', 'net'],
    UMBRELLA_WATER_MULT: 2,  // المظلة: السقاية كل ضعف المدة

    // الطقس: يُختار مرة واحدة كل يوم (اليوم يبدأ الساعة 6 صباحاً)
    WEATHER: {
      sunny: { id: 'sunny', name: 'مشمس', icon: '☀️', weight: 45, growth: 1.1, desc: 'النباتات بتكبر أسرع شوي' },
      cloudy: { id: 'cloudy', name: 'غائم', icon: '⛅', weight: 35, growth: 1, desc: 'يوم هادي ولطيف' },
      rainy: { id: 'rainy', name: 'ماطر', icon: '🌧️', weight: 20, growth: 1, desc: 'المطر بيسقي كل حوض مرة وحدة' },
    },

    // الآفات: دودة صغيرة تبطئ النمو حتى يشيلها الطفل (مجاناً). لا تأكل شيئاً
    PESTS: {
      CHECK_MS: 30 * 1000,
      CHANCE_PER_PLANT: 0.05,
      MAX_CHANCE: 0.25,
      MAX: 1,
      SLOW: 0.5,
    },

    // طلبات الجيران: 3 طلبات يومية، المكافأة ضعف سعر البيع، ولا تنتهي صلاحيتها
    ORDERS: {
      SLOTS: 3,
      REWARD_MULT: 2,
      NEIGHBORS: [
        { name: 'أم محمد', she: true, icon: '👩‍🦱' },
        { name: 'أبو خليل', she: false, icon: '👴' },
        { name: 'ستّي فاطمة', she: true, icon: '👵' },
        { name: 'عمّو سامي', she: false, icon: '🧔' },
        { name: 'الجارة سلمى', she: true, icon: '👩' },
        { name: 'أبو أحمد', she: false, icon: '👨‍🦳' },
        { name: 'خالتو ليلى', she: true, icon: '👩‍🦰' },
        { name: 'أم يوسف', she: true, icon: '🧕' },
      ],
    },

    // الحمام الزاجل: يزور مرة يومياً، وهديته ثابتة بالترتيب (غير عشوائية)
    PIGEON_GIFTS: [
      { coins: 15 },
      { seeds: { mint: 2 } },
      { coins: 20 },
      { seeds: { basil: 2 } },
      { coins: 25 },
      { seeds: { tomato: 1 } },
    ],

    // مكافأة الدخول: حسب عدد أيام الدخول الكلي (لا توجد سلسلة تنكسر)
    LOGIN_REWARDS: [
      { coins: 20 },
      { seeds: { mint: 3 } },
      { coins: 30 },
      { seeds: { basil: 2 } },
      { coins: 40 },
      { seeds: { tomato: 2 } },
      { coins: 60 },
    ],

    // العصافير: تزور النباتات أثناء اللعب فقط، وتبطئ النمو قليلاً وهي واقفة، بدون أي خسارة
    BIRDS: {
      CHECK_MS: 6000,          // كل كم ثانية نشوف إذا في عصفور جاي
      CHANCE_PER_PLANT: 0.12,  // كل نبتة تكبر تزيد احتمال الزيارة
      MAX_CHANCE: 0.6,
      MAX_PERCHED: 3,          // أقصى عدد عصافير واقفة على النباتات معاً
      STAY_MS: 45 * 1000,      // العصفور يطير لوحده بعد هالمدة
      SLOW: 0.5,               // النمو بنصف السرعة أثناء وقوفه
    },

    // مكافآت "حارس السطح" (ثابتة وغير عشوائية)
    GUARD: {
      NET_EVERY: 10,           // كل 10 عصافير تطردها = شبكة حماية
      SCARECROW_AT: 40,        // عند 40 عصفوراً = فزاعة تحرس السطح كله
    },

    // الجدّة تسقي عنك: غياب أطول من هذا = تُسقى كل النباتات مرة واحدة
    GRANDMA_AFTER: 24 * HOUR,

    // منطقة الأهل
    LIMIT_OPTIONS: [0, 10, 15, 20, 30, 45, 60], // دقائق اللعب اليومية (0 = بدون حد)
    LIMIT_WARN_MS: 2 * MIN,                     // تنبيه قبل النهاية
    LIMIT_EXTRA_MIN: 10,                        // "+10 دقائق لليوم فقط"
    PLAYLOG_DAYS: 14,                           // نحتفظ بدقائق اللعب لآخر 14 يوماً
    PARENT_DEFAULTS: {
      pin: '',                 // رمز الأهل (مخزّن مموّهاً). فارغ = سؤال الضرب
      limitMin: 0,
      warn: true,
      sleepOn: true, sleepStart: '20:00', sleepEnd: '06:00',
      schoolOn: false, schoolDays: [0, 1, 2, 3, 4], schoolStart: '07:00', schoolEnd: '14:00',
      sound: true, music: false, notifications: true,
      extraDay: '', extraMin: 0, // دقائق إضافية لليوم يعطيها الأهل
      warnedDay: '',
    },
    WEEKDAYS: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],

    // البداية السريعة: أول 5 نباتات تجهز بدقيقة، وتحتاج سقاية الزراعة فقط
    QUICK_START: { COUNT: 5, MS: 60 * 1000 },

    // مطبخ السطح: وصفات ثابتة، والمكونات تُخصم فقط عند انتهاء الطبخ
    RECIPES: {
      tea: { id: 'tea', name: 'شاي بالنعناع', icon: '🍵', vessel: '🫖', level: 1, needs: { mint: 2 }, price: 36, action: 'stir', taps: 8 },
      sauce: { id: 'sauce', name: 'صلصة بندورة', icon: '🥫', vessel: '🍲', level: 2, needs: { tomato: 1, basil: 1 }, price: 100, action: 'mash', taps: 10 },
      hot: { id: 'hot', name: 'شطة حارة', icon: '🌶️', vessel: '🫙', level: 4, needs: { pepper: 2 }, price: 270, action: 'mash', taps: 10 },
      makdous: { id: 'makdous', name: 'مكدوس', icon: '🍆', vessel: '🫙', level: 6, needs: { eggplant: 1, pepper: 1 }, price: 375, action: 'stir', taps: 10 },
      zaatar: { id: 'zaatar', name: 'خلطة زعتر', icon: '🌿', vessel: '🥣', level: 8, needs: { thyme: 2 }, price: 780, action: 'mash', taps: 12 },
      sage: { id: 'sage', name: 'شاي ميرمية', icon: '☕', vessel: '🫖', level: 10, needs: { sage: 1, mint: 1 }, price: 470, action: 'stir', taps: 10 },
      lemonade: { id: 'lemonade', name: 'ليموناضة', icon: '🍋', vessel: '🫙', level: 12, needs: { lemon: 1, mint: 2 }, price: 260, action: 'squeeze', taps: 12 },
    },
    RECIPE_ORDER: ['tea', 'sauce', 'hot', 'makdous', 'zaatar', 'sage', 'lemonade'],
    COOK_ACTIONS: {
      stir: { icon: '🥄', label: 'حرّك' },
      mash: { icon: '🥣', label: 'اهرس' },
      squeeze: { icon: '🍋', label: 'اعصر' },
    },

    // بسطة الحارة: الزبون يطلب صنفاً من مخزنك ويدفع إكرامية ثابتة
    STALL: {
      TIP: 1.25,
      CUSTOMERS: ['👩', '👨', '👵', '👴', '🧒', '👧', '🧕', '🧔'],
    },

    // قطة السطح: القلوب تزيد فقط ولا تنقص أبداً، والزينة مكافآت ثابتة
    CAT: {
      DEFAULT_NAME: 'مشمش',
      MAX_NAME: 12,
      DAY_HEARTS: 10,
      THROWS: 5,
      MILESTONES: [
        { hearts: 5, item: 'bow', name: 'فيونكة حمراء', icon: '🎀' },
        { hearts: 15, item: 'bell', name: 'جرس صغير', icon: '🔔' },
        { hearts: 30, item: 'hat', name: 'قبعة قش', icon: '👒' },
      ],
    },

    // خريطة المراحل
    MAP_LEVELS: 20,
    MAP_ZONES: [
      { from: 1, name: 'حارتنا', top: '#dff2c9', bottom: '#f6ecd3', deco: ['🏠', '🌳', '🐈', '🏡', '🌼', '🚲'] },
      { from: 6, name: 'سوق الخضار', top: '#ffe9bf', bottom: '#dff2c9', deco: ['🧺', '🍉', '🛒', '🌻', '🥕', '⛱️'] },
      { from: 11, name: 'كروم الزيتون', top: '#d2ebb8', bottom: '#ffe9bf', deco: ['🫒', '🌳', '🐑', '🍇', '🌾', '🐓'] },
      { from: 16, name: 'جبل الزعتر', top: '#d8edf8', bottom: '#d2ebb8', deco: ['⛰️', '🌲', '🦋', '☁️', '🐐', '🌿'] },
    ],

    ART: { useImages: false },

    PLANTS,
    PLANT_ORDER: ['mint', 'basil', 'tomato', 'pepper', 'eggplant', 'thyme', 'sage', 'lemon'],
  };
})();
