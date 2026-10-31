'use strict';
/* =========================================================
   sw.js — تشغيل اللعبة بدون إنترنت.
   ملفات اللعبة: الشبكة أولاً حتى تصل التحديثات، والنسخة المحفوظة عند انقطاع الإنترنت.
   الخطوط: من المحفوظ أولاً.
   عند إضافة ملف جديد للعبة: أضفه إلى SHELL وارفع رقم CACHE.
   ========================================================= */

const CACHE = 'sathi-v1';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'data.js',
  'state.js',
  'game.js',
  'parent.js',
  'ui.js',
  'birds.js',
  'map.js',
  'kitchen.js',
  'stall.js',
  'cat.js',
  'sound.js',
  'tutorial.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// الشبكة أولاً، مع مهلة قصيرة حتى لا تعلق اللعبة على إنترنت ضعيف
function networkFirst(req) {
  return caches.open(CACHE).then(cache => new Promise(resolve => {
    let done = false;
    const fallback = () => cache.match(req, { ignoreSearch: true }).then(hit => hit || cache.match('index.html'));
    const timer = setTimeout(() => { done = true; fallback().then(resolve); }, 4000);
    fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => {
      if (!done) { done = true; clearTimeout(timer); fallback().then(resolve); }
    });
  }));
}

function cacheFirst(req) {
  return caches.open(CACHE).then(cache => cache.match(req).then(hit => hit || fetch(req).then(res => {
    cache.put(req, res.clone());
    return res;
  })));
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(e.request));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(e.request));
});
