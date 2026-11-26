/* CocoaCanvas offline shell.
 *
 * The app is one large document, so how this cache behaves decides how a launch feels.
 * Cache-first with a background refresh: an installed copy paints immediately from the
 * cache and keeps working with no connection, instead of waiting on the network every
 * launch (which is what made a cold launch from the home screen look hung).
 */
const C = 'cocoacanvas-v3';
const SHELL = [
  './',
  'index.html',
  'editor.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];
const SHELL_URL = new URL('editor.html', self.registration.scope).href;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(C);
    /* Tolerant precache: one flaky file must never fail the whole install, or the app
       stays slow and offline-broken until the browser decides to retry. */
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  let u;
  try { u = new URL(r.url); } catch (_) { return; }
  if (u.origin !== location.origin) return;

  /* Store under origin+path: a navigation request cannot itself go into a Cache. */
  const key = u.origin + u.pathname;

  e.respondWith((async () => {
    const c = await caches.open(C);
    const hit = await c.match(key, { ignoreSearch: true });

    /* Refresh in the background either way, so the next launch has the newest build. */
    const fresh = fetch(r)
      .then(res => {
        if (res && res.ok) c.put(key, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => null);

    if (hit) {
      e.waitUntil(fresh.then(() => {}, () => {}));
      return hit;
    }

    const res = await fresh;
    if (res) return res;

    /* Nothing cached and the network is gone: fall back to the app shell. */
    const shell = await c.match(SHELL_URL, { ignoreSearch: true });
    if (shell) return shell;
    return new Response('', { status: 504, statusText: 'Offline' });
  })());
});
