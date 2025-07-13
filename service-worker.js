// Kache jina la kache. Tumia toleo jipya ili kuhakikisha service worker mpya inasakinishwa.
const CACHE_NAME = 'mahudhurio-cache-v2'; // Imebadilishwa kutoka 'tendency-cache-v2' kwa uwazi zaidi

// Orodha kamili ya faili za kukache, ikijumuisha Firebase CDN na ikoni moja tu.
// MUHIMU: Hakikisha njia zote za faili hizi ni sahihi na faili zenyewe zinapatikana.
const urlsToCache = [
  '/', // Kache ukurasa wa nyumbani
  '/index.html', // Kache faili kuu ya HTML
  '/manifest.json', // Kache faili ya manifest
  // Njia ya ikoni moja tu kama ilivyofafanuliwa kwenye manifest.json
  '/icons/icon-192x192.png',
  // Maktaba za JavaScript kutoka CDN zinazotumiwa na programu
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

// Tukio la 'install': Hukache faili muhimu wakati service worker inasakinishwa.
// self.skipWaiting() inahakikisha service worker mpya inachukua udhibiti mara moja.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Inakache faili muhimu.');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Anzisha service worker mpya mara moja
      .catch(error => {
        console.error('Service Worker: Kushindwa kukache faili zote:', error);
      })
  );
});

// Tukio la 'activate': Hufuta kache za zamani ili kuhakikisha toleo jipya linatumika.
// self.clients.claim() inaruhusu service worker mpya kuchukua udhibiti wa tabo zote zilizofunguliwa.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Inafuta kache ya zamani:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Chukua udhibiti wa wateja wote mara moja
  );
});

// Tukio la 'fetch': Hujibu maombi ya mtandao kutoka kache kwanza, kisha mtandao.
// Ikiwa faili haipo kwenye kache, inajaribu kuichukua kutoka mtandaoni na kuikache kwa matumizi ya baadaye.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Ikiwa jibu lipo kwenye kache, lirudishe.
        if (response) {
          return response;
        }
        // Vinginevyo, nenda kwenye mtandao.
        return fetch(event.request).then(
          response => {
            // Angalia ikiwa tumepokea jibu halali.
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Kache jibu jipya kwa matumizi ya baadaye.
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
          console.log('Service Worker: Kushindwa kufetch au hakuna mtandao:', event.request.url, error);
          // Kwa maombi ya HTML, unaweza kurudisha ukurasa wa 'offline' au 'index.html'.
          // Kwa faili zingine (kama picha, CSS), kurudisha 'index.html' si sahihi.
          // Kwa sasa, tunarudisha undefined, ambayo itasababisha ombi kushindwa.
          // Ikiwa unataka kurudisha ukurasa wa nje ya mtandao kwa maombi yote yaliyoshindwa,
          // unaweza kuongeza mantiki hapa ya kuangalia aina ya ombi.
          if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
            return caches.match('/index.html'); // Rudisha index.html kama fallback kwa kurasa za HTML
          }
          return undefined; // Acha maombi mengine yashindwe kimya kimya
        });
      })
  );
});
