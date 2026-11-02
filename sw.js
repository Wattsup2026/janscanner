// オフライン用キャッシュ。アプリを更新したら VERSION を上げる。
const VERSION = "jan-scanner-v6";
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
  // 画面本体と設定は、通信できれば常に最新版を使う（3秒で応答がなければ端末内の版）
  const u = new URL(e.request.url);
  if (e.request.mode === "navigate" || u.pathname.endsWith("/config.js") || u.pathname.endsWith("/index.html")) {
    e.respondWith(
      Promise.race([
        fetch(e.request).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
          return res;
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
      ]).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
    return;
  }
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
