/* PWA shell cache only. Never cache Supabase/API responses or private student data. */
const CACHE_NAME = 'qlnn-shell-v3.0.5.25.36';
const BASE = '/quan-ly-ne-nep/';
const SHELL = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'css/app.css',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('qlnn-shell-') && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  // Do not cache JavaScript modules: always revalidate them to avoid mixed-version bugs.
  if (/\.(m?js)$/.test(url.pathname) || url.pathname.includes('/rest/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => { if (res.ok) caches.open(CACHE_NAME).then(c => c.put(BASE + 'index.html', res.clone())); return res; }).catch(() => caches.match(BASE + 'index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok && ['style','image','font'].includes(req.destination)) caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
    return res;
  })));
});
self.addEventListener('push', event => {
  let data = {title:'THPT Lê Hồng Phong', body:'Bạn có thông báo mới.', url:BASE};
  try { data = {...data, ...(event.data ? event.data.json() : {})}; } catch {}
  event.waitUntil(self.registration.showNotification(data.title || 'THPT Lê Hồng Phong', {
    body: data.body || 'Bạn có thông báo mới.',
    icon: BASE + 'icons/icon-192.png',
    badge: BASE + 'icons/icon-192.png',
    data: {url: data.url || BASE},
    tag: data.tag || undefined,
    renotify: false
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || BASE, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
    const same = clients.find(c => c.url.startsWith(self.location.origin + BASE));
    if (same) { same.navigate(target); return same.focus(); }
    return self.clients.openWindow(target);
  }));
});
