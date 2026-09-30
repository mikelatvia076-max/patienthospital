// Agnes Memorial Hospital: "Install app" banner + "internet required" lock screen.
// Keep this file in the same folder as index.html, manifest.json, sw.js and the icons.
(function () {
  if (window.__agnesInstallBanner) return;
  window.__agnesInstallBanner = true;

  var me = document.currentScript || document.querySelector('script[src*="install-banner"]');
  var d = (me && me.dataset) || {};
  var BASE = (me && me.src) || location.href;                       // every file is found next to this script
  var url = function (f) { return new URL(f, BASE).href; };
  var KEY = "installDismissed:" + (d.appKey || "app");
  var NAME = d.appName || document.title;
  var SW = url(d.sw || "sw.js");
  var ICON = url("icon-192.png");
  var PING = url("manifest.json");
  var DAYS = 7;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register(SW).catch(function () {}); });
  }

  var css =
    ".ib-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;background:linear-gradient(90deg,#0a2a3a,#0f6b73);color:#fff;font-family:'Nunito Sans','Segoe UI',Arial,sans-serif;box-shadow:0 3px 14px rgba(0,0,0,.35)}" +
    ".ib-bar[hidden]{display:none}" +
    ".ib-bar img{width:42px;height:42px;border-radius:11px;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.35)}" +
    ".ib-text{display:flex;flex-direction:column;flex:1;min-width:0;line-height:1.3}" +
    ".ib-text strong{font-size:15px}.ib-text span{font-size:13px;color:#cfeeee}" +
    ".ib-go{flex:none;border:0;border-radius:22px;padding:9px 18px;background:#f0b94d;color:#081822;font-size:14px;font-weight:800;cursor:pointer}" +
    ".ib-go:hover{background:#fff}" +
    ".ib-x{flex:none;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:15px;cursor:pointer}" +
    ".ib-x:hover{background:rgba(255,255,255,.32)}" +
    "html.ib-on body:not(.ib-fixed){margin-top:var(--banner-h,0px)}" +
    "#loginpage{padding-top:calc(clamp(8px,2vh,22px) + var(--banner-h,0px))}" +   // landing page: keep the panel below the banner
    "@media(max-width:640px){.ib-bar{gap:10px;padding-left:12px;padding-right:12px}.ib-text span{font-size:12px}.ib-bar img{width:36px;height:36px}}" +
    "dialog.ib-off{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;border:0;border-radius:0;padding:24px;color:#fff;text-align:center;font-family:'Nunito Sans','Segoe UI',Arial,sans-serif;background:radial-gradient(600px 400px at 50% 0%,#0f6b73 0%,transparent 70%),#081822}" +
    "dialog.ib-off[open]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}" +
    "dialog.ib-off::backdrop{background:#081822}" +
    "dialog.ib-off svg{width:min(240px,70vw);margin-bottom:6px}" +
    "dialog.ib-off h2{font-size:28px;margin:0;color:#fff}" +
    "dialog.ib-off p{max-width:380px;font-size:16px;line-height:1.5;color:#b9dedc;margin:0}" +
    "dialog.ib-off .ib-msg{font-size:14px;min-height:20px;color:#f0b94d}" +
    "dialog.ib-off button{border:0;border-radius:24px;padding:12px 28px;background:#f0b94d;color:#081822;font-size:16px;font-weight:800;cursor:pointer}" +
    "dialog.ib-off button:hover{background:#fff}dialog.ib-off button:disabled{opacity:.7;cursor:wait}";

  function init() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    var bar = document.createElement("div");
    bar.className = "ib-bar"; bar.hidden = true;
    bar.innerHTML =
      '<img src="' + ICON + '" alt="">' +
      '<div class="ib-text"><strong></strong><span>Open it straight from your home screen, like an app.</span></div>' +
      '<button type="button" class="ib-go">Install</button>' +
      '<button type="button" class="ib-x" aria-label="Dismiss">&#10005;</button>';
    bar.querySelector("strong").textContent = "Install " + NAME;
    document.body.prepend(bar);
    var text = bar.querySelector(".ib-text span"), go = bar.querySelector(".ib-go");
    if (getComputedStyle(document.body).position === "fixed") document.body.classList.add("ib-fixed");

    var off = document.createElement("dialog");
    off.className = "ib-off";
    off.innerHTML =
      '<svg viewBox="0 0 220 60" aria-hidden="true"><path d="M4 30h60l10-16 14 38 12-30 8 8h28" fill="none" stroke="#f0b94d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M146 30h70" fill="none" stroke="#f0b94d" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9" opacity=".6"/></svg>' +
      "<h2>No internet connection</h2>" +
      "<p>Agnes Memorial Hospital needs internet to work. Connect to Wi-Fi or mobile data, then try again.</p>" +
      '<p class="ib-msg" role="status"></p><button type="button" class="ib-retry">Try again</button>';
    document.body.appendChild(off);
    var offMsg = off.querySelector(".ib-msg"), retry = off.querySelector(".ib-retry");
    off.addEventListener("cancel", function (e) { e.preventDefault(); });   // Esc cannot close it

    // ---------- install ----------
    var standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var deferred = null;

    function dismissed() { try { var t = Number(localStorage.getItem(KEY)); return t && Date.now() - t < DAYS * 864e5; } catch (e) { return false; } }
    function setHeight() {
      document.documentElement.style.setProperty("--banner-h", (bar.hidden ? 0 : bar.offsetHeight) + "px");
      document.documentElement.classList.toggle("ib-on", !bar.hidden);
      window.dispatchEvent(new Event("resize"));   // lets pages re-fit their layout
    }
    function showBar() { if (standalone || dismissed()) return; bar.hidden = false; setHeight(); }
    function hideBar() { bar.hidden = true; setHeight(); }

    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; showBar(); });
    window.addEventListener("appinstalled", hideBar);

    go.onclick = async function () {
      if (!deferred) {   // this browser gave no one-tap install, so explain the manual way
        text.textContent = "Open your browser menu, then tap Install app or Add to Home screen. (Opened from WhatsApp or Facebook? Open the link in Chrome first.)";
        setHeight(); return;
      }
      deferred.prompt(); await deferred.userChoice; deferred = null; hideBar();
    };
    bar.querySelector(".ib-x").onclick = function () {
      hideBar(); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
    };

    if (isIOS && !standalone) { text.textContent = "Tap Share, then Add to Home Screen."; go.hidden = true; }
    showBar();

    // ---------- internet required ----------
    function lock() { if (off.open) return; offMsg.textContent = ""; off.showModal(); }
    function unlock() { if (off.open) off.close(); }
    // Asks the real network (the service worker skips "ping" requests) so a saved page can't fake a connection.
    async function checkOnline() {
      if (!navigator.onLine) return false;
      try {
        var ctrl = new AbortController(), t = setTimeout(function () { ctrl.abort(); }, 8000);
        await fetch(PING + "?ping=" + Date.now(), { cache: "no-store", signal: ctrl.signal });
        clearTimeout(t); return true;
      } catch (e) { return false; }
    }
    async function refresh() { (await checkOnline()) ? unlock() : lock(); }

    window.addEventListener("offline", lock);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
    setInterval(function () { if (off.open) refresh(); }, 5000);
    retry.onclick = async function () {
      retry.disabled = true; offMsg.textContent = "Checking connection...";
      if (await checkOnline()) unlock(); else offMsg.textContent = "Still offline. Check your Wi-Fi or mobile data.";
      retry.disabled = false;
    };
    if (!navigator.onLine) lock();
  }

  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();