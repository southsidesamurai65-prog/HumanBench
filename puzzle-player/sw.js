/* Pencil Puzzle Player - service worker (offline cache). */
const CACHE = "pp-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./data/puzzles.js",
  "./data/solutions.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./vendor/pzprjs/dist/js/pzpr.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/country.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/dbchoco.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/firefly.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/heyawake.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/hitori.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/kurodoko.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/lightup.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/lits.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/mashu.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/norinori.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/nurikabe.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/nurimaze.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/nurimisaki.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/sashigane.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/shakashaka.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/shikaku.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/slither.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/sudoku.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/tapa.js",
  "./vendor/pzprjs/dist/js/pzpr-samples/yajilin.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/cbblock.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/country.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/firefly.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/heyawake.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/hitori.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/kurodoko.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/lightup.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/lits.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/loute.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/mashu.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/nurikabe.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/nurimaze.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/shakashaka.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/shikaku.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/slither.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/sudoku.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/tapa.js",
  "./vendor/pzprjs/dist/js/pzpr-variety/yajilin.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // App shell: serve the cached shell for navigations when possible.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html", { ignoreSearch: true })
        .then((hit) => hit || fetch(req).catch(() => caches.match("./index.html", { ignoreSearch: true })))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }));
    })
  );
});
