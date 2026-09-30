/* Install banner + service worker registration
   - Shows a banner at the TOP of the page offering to install the app
   - Disappears once installed (or when running as the installed app)
   - Android / Chrome / Edge: real "Install" button
   - iPhone / iPad: shows "Share -> Add to Home Screen" instructions
   Usage: <script src="/install-banner.js" defer data-app-key="ammh"
                  data-app-name="Agnes Memorial Hospital" data-sw="/sw.js"></script> */
(function () {
  'use strict';

  var me = document.currentScript;
  var appKey  = (me && me.dataset.appKey)  || 'app';
  var appName = (me && me.dataset.appName) || document.title;
  var swPath  = (me && me.dataset.sw)      || '/sw.js';

  var K_INSTALLED = 'pwa-installed:' + appKey;
  var K_DISMISSED = 'pwa-dismissed:' + appKey;
  var DISMISS_DAYS = 3;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(swPath, { scope: '/' }).catch(function (err) {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  /* ---------- state helpers ---------- */
  function isStandalone() {
    return (window.matchMedia && (
              matchMedia('(display-mode: standalone)').matches ||
              matchMedia('(display-mode: fullscreen)').matches ||
              matchMedia('(display-mode: minimal-ui)').matches)) ||
           window.navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
           (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS
  }

  function recentlyDismissed() {
    var t = parseInt(lsGet(K_DISMISSED) || '0', 10);
    return t && (Date.now() - t) < DISMISS_DAYS * 86400000;
  }

  // Already running as the installed app -> remember it and never show the banner
  if (isStandalone()) { lsSet(K_INSTALLED, '1'); return; }

  var deferredPrompt = null;
  var banner = null;

  /* ---------- styles ---------- */
  function injectStyles() {
    if (document.getElementById('pwa-banner-css')) return;
    var css = [
      '#pwa-banner{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;gap:12px;',
      'padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px;',
      'background:linear-gradient(90deg,#062a3a,#0a4a52);color:#fff;font-family:"Nunito Sans","Segoe UI",Arial,sans-serif;',
      'border-bottom:2px solid #00c9b7;box-shadow:0 6px 20px rgba(0,0,0,.45);',
      'transform:translateY(-110%);transition:transform .35s ease}',
      '#pwa-banner.show{transform:translateY(0)}',
      '#pwa-banner img{width:40px;height:40px;border-radius:10px;flex-shrink:0}',
      '#pwa-banner .pwa-text{flex:1;min-width:0;line-height:1.25;text-align:left}',
      '#pwa-banner .pwa-title{font-weight:800;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#pwa-banner .pwa-sub{font-size:.78rem;color:rgba(255,255,255,.82)}',
      '#pwa-banner .pwa-sub svg{width:14px;height:14px;vertical-align:-2px}',
      '#pwa-banner button{font:inherit;cursor:pointer;border:0}',
      '#pwa-banner .pwa-install{padding:9px 18px;border-radius:999px;font-weight:800;font-size:.88rem;color:#fff;',
      'background:linear-gradient(90deg,#00b4d8,#00c96b);box-shadow:0 0 14px rgba(0,220,200,.5);flex-shrink:0}',
      '#pwa-banner .pwa-install:active{transform:scale(.96)}',
      '#pwa-banner .pwa-close{background:transparent;color:#fff;font-size:1.5rem;line-height:1;padding:4px 8px;opacity:.8;flex-shrink:0}',
      '#pwa-banner button:focus-visible{outline:3px solid #f0b94a;outline-offset:2px}',
      /* push the page down while the banner is visible so nothing is covered */
      'html.has-install-banner #loginpage{height:calc(100vh - var(--banner-h,0px));',
      'height:calc(100dvh - var(--banner-h,0px));margin-top:var(--banner-h,0px)}',
      '@media (max-width:360px){#pwa-banner .pwa-sub{display:none}}',
      '@media (prefers-reduced-motion:reduce){#pwa-banner{transition:none}}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'pwa-banner-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- show / hide ---------- */
  function refit() { window.dispatchEvent(new Event('resize')); }

  function show(ios) {
    if (banner || isStandalone()) return;
    injectStyles();

    banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Install app');

    var shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

    banner.innerHTML =
      '<img src="/icons/icon-192.png" alt="">' +
      '<div class="pwa-text">' +
        '<div class="pwa-title">Install ' + appName + '</div>' +
        '<div class="pwa-sub">' + (ios
          ? 'Tap ' + shareIcon + ' Share, then “Add to Home Screen”'
          : 'Quick access from your home screen') + '</div>' +
      '</div>' +
      (ios ? '' : '<button type="button" class="pwa-install">Install</button>') +
      '<button type="button" class="pwa-close" aria-label="Close">&times;</button>';

    document.body.appendChild(banner);

    var inst = banner.querySelector('.pwa-install');
    if (inst) inst.addEventListener('click', doInstall);
    banner.querySelector('.pwa-close').addEventListener('click', function () {
      lsSet(K_DISMISSED, String(Date.now()));
      hide();
    });

    // next frame so the slide-down animation runs
    requestAnimationFrame(function () {
      document.documentElement.style.setProperty('--banner-h', banner.offsetHeight + 'px');
      document.documentElement.classList.add('has-install-banner');
      banner.classList.add('show');
      refit();
    });
  }

  function hide() {
    if (!banner) return;
    var b = banner;
    banner = null;
    b.classList.remove('show');
    document.documentElement.classList.remove('has-install-banner');
    document.documentElement.style.setProperty('--banner-h', '0px');
    refit();
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
  }

  function doInstall() {
    if (!deferredPrompt) return;
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    p.userChoice.then(function (choice) {
      if (choice && choice.outcome === 'accepted') {
        lsSet(K_INSTALLED, '1');
      }
      hide();   // accepted -> installed; dismissed -> don't nag again this visit
    });
  }

  /* ---------- events ---------- */
  // Chrome / Edge / Samsung Internet: the browser says "this app can be installed"
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    // this event only fires when the app is NOT installed, so clear any stale flag
    lsDel(K_INSTALLED);
    if (!recentlyDismissed()) show(false);
  });

  // App got installed -> remove the banner for good
  window.addEventListener('appinstalled', function () {
    lsSet(K_INSTALLED, '1');
    deferredPrompt = null;
    hide();
  });

  // Also hide if the page switches into app (standalone) mode
  if (window.matchMedia) {
    var mq = matchMedia('(display-mode: standalone)');
    var onChange = function (e) { if (e.matches) { lsSet(K_INSTALLED, '1'); hide(); } };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // iPhone / iPad have no install event -> show the instructions banner
  if (isIOS() && !lsGet(K_INSTALLED) && !recentlyDismissed()) {
    var start = function () { setTimeout(function () { show(true); }, 800); };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
  }
})();