/* Agnes Memorial Hospital – service worker
   - Offline page when there is no internet
   - Caches the app shell + static files so the app opens fast
   - NEVER caches API calls / patient data */

const VERSION = 'ammh-v1';
const CACHE = VERSION + '-static';

const PRECACHE = [
  '/offline.html',
  '/agnes.css',
  '/steve.js',
  '/install-banner.js',
  '/manifest.webmanifest',
  '/kasa.png',
  '/agneses.pdf.jpeg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon-32.png'
];

const STATIC_EXT = /\.(?:css|js|png|jpe?g|gif|svg|ico|webp|woff2?|ttf)$/i;
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // add one by one so a single missing file does not break the install
      Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Page navigations: network first, offline page if it fails
  if (req.mode === 'navigate') {
    event.respondWith(
      Promise.race([fetch(req), timeout(10000)]).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match('/offline.html')) ||
               new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // Fonts / icon fonts / email library from CDNs
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Same-origin static files (css, js, images)
  if (url.origin === self.location.origin && STATIC_EXT.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Everything else (API calls: /patients, /appointments, /login ...) goes straight to the network
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});