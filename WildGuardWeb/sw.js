// sw.js - Service Worker for browser telemetry interception and local routing
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Intercept Zhiyun tracker statistics requests to prevent browser extension console 404 errors
    if (url.pathname.includes('zybTrackerStatisticsAction') || url.pathname.includes('hybridaction') || url.href.includes('hybridaction')) {
        event.respondWith(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            })
        );
        return;
    }
    
    // Intercept other possible extension tracker files
    if (url.pathname.includes('copilot') && url.pathname.endsWith('.js')) {
        event.respondWith(
            new Response('', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' }
            })
        );
        return;
    }
    
    // Normal network fetch for everything else
    event.respondWith(
        fetch(event.request).catch(() => {
            // Local fallback if offline and cache misses
            return new Response('Network request failed', { status: 408 });
        })
    );
});
