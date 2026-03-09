const CACHE_NAME = 'sage-cacher-v1';
const CACHED_URLS = ['CRUD/coursebook'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (!CACHED_URLS.some(url => event.request.url.includes(url))) return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async cache => {
            const cacheKey = new Request(event.request.url);
            const cached = await cache.match(cacheKey);
            
            if (cached) {
                const cachedDate = cached.headers.get('sw-cached-date');
                if (cachedDate) {
                    const cached_time = new Date(cachedDate);
                    const now = new Date();
                    if (cached_time.getMonth() === now.getMonth() && 
                        cached_time.getFullYear() === now.getFullYear()) {
                        return cached;
                    }
                }
            }

            const response = await fetch(event.request);
            if (response.ok) {
                // Clone and add our own cache date header
                const body = await response.arrayBuffer();
                const newHeaders = new Headers(response.headers);
                newHeaders.set('sw-cached-date', new Date().toISOString());
                const cachedResponse = new Response(body, {
                    status: response.status,
                    headers: newHeaders
                });
                cache.put(cacheKey, cachedResponse);
                return new Response(body, { status: response.status, headers: response.headers });
            }
            return response;
        })
    );
});