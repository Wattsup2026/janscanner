// オフライン用キャッシュ。アプリを更新したら VERSION を上げる。
const VERSION = "jan-scanner-v3";
const FILES = [
  "./",
  "./index.html",
  "./config.js",
  "./zxing.min.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// まず端末内のキャッシュで即起動し、通信できれば裏で最新版に入れ替える
// （電波の弱い売場でも待たされない）
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // 他サイト（マスタ配信のApps Scriptなど）への通信はキャッシュしない
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const net = fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || net;
    })
  );
});
