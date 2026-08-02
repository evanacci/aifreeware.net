/*!
 * theme.js — the colourway engine. Standalone: recolours the page off a palette and
 * remembers the pick, with or without the bar. Reads window.UtilBar.colour, exposes
 * window.UBTheme, fires document event 'utilbar:colour'. Include before utilbar-colour.js.
 */
(function () {
  var cfg = (window.UtilBar && window.UtilBar.colour) || null;
  if (!cfg || !cfg.palette || !cfg.palette.length) return;      // no colour config -> engine idle
  var CW = cfg.palette, VAR = cfg.accentVar || '--accent', STORE = cfg.store || 'ub-cw', ICON = cfg.icon || '';
  var INK_DARK = cfg.inkDark || '#160f16', INK_LIGHT = cfg.inkLight || '#ffffff';   // text-on-accent, overridable per site
  var iconFor = function (n) { return ICON ? ICON.replace('{name}', n) : ''; };
  var idx = function (n) { for (var i = 0; i < CW.length; i++) if (CW[i][0] === n) return i; return -1; };
  var dk = function (x, f) { var s = x.slice(1), a = parseInt(s.slice(0, 2), 16), b = parseInt(s.slice(2, 4), 16), d = parseInt(s.slice(4, 6), 16);
    function p(v) { return ('0' + Math.max(0, Math.round(v * (1 - f))).toString(16)).slice(-2); } return '#' + p(a) + p(b) + p(d); };
  var on = function (x) { var s = x.slice(1), a = parseInt(s.slice(0, 2), 16), b = parseInt(s.slice(2, 4), 16), d = parseInt(s.slice(4, 6), 16);
    return (0.2126 * a + 0.7152 * b + 0.0722 * d) / 255 > 0.6 ? INK_DARK : INK_LIGHT; };
  var saved = function () { try { var v = localStorage.getItem(STORE); return (v && idx(v) >= 0) ? v : null; } catch (e) { return null; } };

  // Per-page colour: only when the site gives a `paths` map. No map -> one colour (CW[0]).
  // With a map: a curated path wins; unmapped paths fall to a stable hash. A saved pick overrides all.
  function pageDefault() {
    if (!cfg.paths) return CW[0][0];
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var name = cfg.paths[path];
    if (name && idx(name) >= 0) return name;
    var h = 2166136261; for (var i = 0; i < path.length; i++) { h ^= path.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return CW[h % CW.length][0];
  }
  var current = saved() || pageDefault();

  function apply(name) {
    var i = idx(name); if (i < 0) i = 0;
    var c = CW[i], r = document.documentElement, url = iconFor(c[0]);
    r.style.setProperty(VAR, c[1]);                       // the site's own accent variable
    r.style.setProperty('--ub-accent', c[1]);             // internal — the bar + pieces read this
    r.style.setProperty('--ub-accent-deep', dk(c[1], .28));
    r.style.setProperty('--ub-on-accent', on(c[1]));
    r.style.setProperty('--on-accent', on(c[1]));         // site-facing alias (demo/README use this)
    r.style.setProperty('--ub-accent-ombre', 'linear-gradient(180deg,' + (c[2] || c[1]) + ' 0%,' + c[1] + ' 52%,' + (c[3] || dk(c[1], .5)) + ' 100%)');
    window.__UBCW = { name: c[0], accent: c[1], iconUrl: url };
    if (url) { try { new Image().src = url; } catch (e) {} }
    var fav = document.querySelector('link[rel="icon"][type="image/svg+xml"]'); if (fav && url) fav.href = url;
    current = c[0];
    try { document.dispatchEvent(new CustomEvent('utilbar:colour', { detail: window.__UBCW })); } catch (e) {}
    return window.__UBCW;
  }

  window.UBTheme = {
    list: CW, iconFor: iconFor, apply: apply, current: function () { return current; },
    set: function (n) { try { localStorage.setItem(STORE, n); } catch (e) {} return apply(n); },
    clear: function () { try { localStorage.removeItem(STORE); } catch (e) {} return apply(CW[0][0]); }
  };
  apply(current);
})();
/*!
 * utilbar.js — the frame. Injects the top strip + a left/right area, and gives the
 * pieces (colour, language, search, status, …) a place to snap into. Knows nothing
 * about any one piece. Include AFTER theme.js (if colour is used), BEFORE the pieces.
 *
 * Plugin API (on window.UtilBar, which is also the config object):
 *   UtilBar.ready(fn)        run fn(UB) once the bar is in the DOM
 *   UtilBar.mount(side, x)   add markup/an element to 'left' or 'right'
 *   UtilBar.css(text)        inject a piece's stylesheet
 *   UtilBar.onBeat(fn, ms)   run fn now + every ms (the status heartbeat)
 *   UtilBar.esc(s)           html-escape helper
 * Fires document event 'utilbar:ready' once built.
 */
(function () {
  var UB = window.UtilBar = window.UtilBar || {};
  UB._q = UB._q || [];
  var built = false, bar, left, right;

  UB.ready = function (fn) { if (built) { try { fn(UB); } catch (e) {} } else UB._q.push(fn); };
  UB.css = function (t) { var s = document.createElement('style'); s.textContent = t; document.head.appendChild(s); };
  UB.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  UB.onBeat = function (fn, ms) { try { fn(); } catch (e) {} return setInterval(fn, ms || 30000); };
  // Right-side order. A piece mounts with its name; its position comes from the config
  // `order` list if the site set one, else a sensible default. Unlisted pieces trail.
  var DEFAULT_ORDER = { language: 10, search: 20, status: 30, extras: 70, signin: 80 };
  function weightFor(key) {
    var ord = UB.order;
    if (ord && ord.indexOf(key) >= 0) return ord.indexOf(key);   // config order wins: 0,1,2,…
    return 100 + (DEFAULT_ORDER[key] || 50);                      // unlisted -> after, in default order
  }
  UB.mount = function (side, node, order) {
    var t = side === 'left' ? left : right; if (!t) return;
    var added = [];
    if (typeof node === 'string') { var d = document.createElement('div'); d.innerHTML = node; while (d.firstChild) { added.push(d.firstChild); t.appendChild(d.firstChild); } }
    else { added.push(node); t.appendChild(node); }
    var o = (typeof order === 'string') ? weightFor(order) : (order == null ? 50 : order);
    added.forEach(function (n) { if (n.nodeType === 1) n.setAttribute('data-ub-order', o); });
    var w = function (el) { var v = el.getAttribute('data-ub-order'); return v == null ? 50 : +v; };
    Array.prototype.slice.call(t.children)                    // keep the side sorted no matter when a piece mounts
      .sort(function (a, b) { return w(a) - w(b); })
      .forEach(function (k) { t.appendChild(k); });
  };

  UB.css([
    '.ub-bar{width:100%;background:#000;border-bottom:1px solid var(--ub-line-soft,rgba(255,255,255,.08))}',
    '.ub-wrap{max-width:var(--ub-max,1180px);margin:0 auto;padding:0 var(--ub-pad,28px);min-height:40px;display:flex;align-items:center;justify-content:space-between;gap:18px}',
    '.ub-left,.ub-right{display:flex;align-items:center}',
    '.ub-right{gap:22px;justify-content:flex-end;flex-wrap:wrap}',
    '.ub-link{font-family:var(--ub-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880);text-decoration:none;background:none;border:0;cursor:pointer;padding:0;display:inline-flex;align-items:center;line-height:1;transition:color .25s}',
    '.ub-link:hover{color:var(--ub-accent,#FF8DC5)}',
    '.ub-signin{color:var(--ub-accent,#FF8DC5)}',
    '.ub-sel{position:relative;display:inline-flex;align-items:center}',
    '.ub-sel>summary{list-style:none;display:inline-flex;align-items:center;gap:7px;line-height:1;cursor:pointer}',
    '.ub-sel>summary::-webkit-details-marker{display:none}',
    '.ub-chev{font-size:9px;opacity:.85;color:var(--ub-muted,#6C6880)}',
    '.ub-menu{position:absolute;top:calc(100% + 9px);min-width:172px;background:var(--ub-surface,#1A1824);border:1px solid var(--ub-line,#2C2939);border-radius:12px;padding:6px;box-shadow:0 18px 44px -14px rgba(0,0,0,.75);display:flex;flex-direction:column;z-index:30}',
    '.ub-menu a,.ub-menu button{font-family:var(--ub-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif);font-size:13.5px;text-align:left;color:var(--ub-text,#ECEAF2);background:none;border:0;border-radius:7px;padding:9px 11px;cursor:pointer;text-decoration:none;transition:background .15s}',
    '.ub-menu a:hover,.ub-menu button:hover{background:var(--ub-ink-2,#14121B)}'
  ].join(''));

  function build() {
    if (built) return;
    bar = document.createElement('div'); bar.className = 'ub-bar';
    bar.innerHTML = '<div class="ub-wrap"><div class="ub-left"></div><div class="ub-right"></div></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    left = bar.querySelector('.ub-left'); right = bar.querySelector('.ub-right');
    UB.bar = bar; UB.leftEl = left; UB.rightEl = right; built = true;

    UB._q.forEach(function (fn) { try { fn(UB); } catch (e) {} }); UB._q = [];   // pieces mount here

    // frame built-ins — high order weights keep them to the right of the pieces
    (UB.extras || []).forEach(function (e) { UB.mount('right', e.html ? e.html : '<a class="ub-link" href="' + UB.esc(e.href || '#') + '">' + UB.esc(e.label || '') + '</a>', 'extras'); });
    if (UB.signin && !UB._signinClaimed) UB.mount('right', '<a class="ub-link ub-signin" href="' + UB.esc(UB.signin.href || '#') + '">' + UB.esc(UB.signin.label || 'Sign in') + '</a>', 'signin');   // utilbar-signin.js, if included, claims this
    if (!left.children.length) UB.mount('left', '<a class="ub-link" href="' + UB.esc(UB.home || '/') + '">' + UB.esc(UB.brand || 'Home') + '</a>');

    // one close-on-outside handler for every dropdown in the bar
    document.addEventListener('click', function (e) {
      Array.prototype.forEach.call(bar.querySelectorAll('details[open]'), function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
    });
    try { document.dispatchEvent(new CustomEvent('utilbar:ready', { detail: { bar: bar } })); } catch (e) {}
  }

  // Wait for every piece to have registered its ready() callback before building.
  //
  // While deferred scripts are running, readyState is already 'interactive' but
  // DOMContentLoaded has not fired, so the old 'loading' test fell through to
  // setTimeout(0). Deferred scripts are separate tasks, so that timer can fire
  // in the gap while a later piece is still downloading: the frame then builds
  // with an empty left side and drops its "Home" fallback in, and the cookie
  // arrives after. It only showed on a cold load, which is what made it look
  // like a config problem.
  if (document.readyState === 'loading' || document.readyState === 'interactive') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    setTimeout(build, 0);   // already past DOMContentLoaded, nothing left to wait for
  }
})();
/*!
 * utilbar-colour.js — the cookie + colour tuner. Snaps into the frame's LEFT and
 * drives theme.js. Needs theme.js + utilbar.js loaded first, and UtilBar.colour set.
 */
(function () {
  var UB = window.UtilBar, T = window.UBTheme;
  if (!UB || !T) return;                                  // no frame or no colour config
  var cfg = UB.colour || {}, esc = UB.esc, list = T.list;

  UB.css([
    '.ub-cwsel>summary{color:var(--ub-muted,#6C6880)}',
    '.ub-cookie{width:18px;height:18px;display:block;image-rendering:pixelated}',
    '.ub-name{font-family:var(--ub-mono,ui-monospace,Menlo,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880)}',
    '.ub-cwsel[open]>summary .ub-name,.ub-cwsel>summary:hover .ub-name{color:var(--ub-accent,#FF8DC5)}',
    '.ub-tuner{position:absolute;top:calc(100% + 9px);left:0;width:300px;background:var(--ub-surface,#1A1824);border:1px solid var(--ub-line,#2C2939);border-radius:14px;padding:16px;box-shadow:0 20px 50px -16px rgba(0,0,0,.8);z-index:30}',
    '.ub-th{display:flex;align-items:center;justify-content:space-between;font-family:var(--ub-mono,Menlo,monospace);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ub-muted,#6C6880);margin-bottom:12px}',
    '.ub-live{display:inline-flex;align-items:center;gap:5px;color:var(--ub-accent,#FF8DC5)}',
    '.ub-live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ub-accent,#FF8DC5)}',
    '.ub-spec{display:flex;align-items:center;gap:12px;padding-bottom:13px;border-bottom:1px solid var(--ub-line-soft,#221F2C);margin-bottom:13px}',
    '.ub-spec img{width:56px;height:56px;image-rendering:pixelated;flex:0 0 auto}',
    '.ub-spec-line{font-family:var(--ub-sans,sans-serif);font-weight:800;font-size:17px;letter-spacing:-.02em;color:var(--ub-text,#ECEAF2);line-height:1.15}',
    '.ub-spec-line .ub-acc{color:var(--ub-accent,#FF8DC5)}',
    '.ub-spec-meta{font-family:var(--ub-mono,Menlo,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ub-muted,#6C6880);margin-top:5px}',
    '.ub-ctl-head{display:flex;align-items:center;justify-content:space-between;font-family:var(--ub-mono,Menlo,monospace);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ub-muted,#6C6880);margin-bottom:8px}',
    '.ub-range{width:100%;-webkit-appearance:none;appearance:none;height:4px;border-radius:3px;background:var(--ub-line,#2C2939);outline:0;margin:2px 0 14px}',
    '.ub-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:var(--ub-accent,#FF8DC5);cursor:pointer;border:2px solid var(--ub-surface,#1A1824)}',
    '.ub-range::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:var(--ub-accent,#FF8DC5);cursor:pointer;border:2px solid var(--ub-surface,#1A1824)}',
    '.ub-chips{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;justify-items:center}',
    '.ub-chip{width:34px;height:34px;padding:0;border:1px solid transparent;border-radius:9px;background:var(--ub-ink-2,#14121B);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .15s,transform .1s}',
    '.ub-chip:hover{transform:translateY(-1px)}',
    '.ub-chip[aria-checked="true"]{border-color:var(--ub-accent,#FF8DC5)}',
    '.ub-chip img{width:20px;height:20px;image-rendering:pixelated}',
    '.ub-chip:nth-child(6n+1):nth-last-child(1){grid-column:1 / -1}',   // centre a lone final chip (e.g. 13th)
    '.ub-acts{margin-top:13px}',
    '.ub-btn{font-family:var(--ub-mono,Menlo,monospace);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880);background:none;border:1px solid var(--ub-line,#2C2939);border-radius:7px;padding:7px 12px;cursor:pointer;transition:color .2s,border-color .2s}',
    '.ub-btn:hover{color:var(--ub-text,#ECEAF2);border-color:var(--ub-muted,#6C6880)}'
  ].join(''));

  var words = cfg.specimen || ['Colour', 'tuner'];
  var spec = words.map(function (w, i) { return i === words.length - 1 ? '<span class="ub-acc">' + esc(w) + '</span>' : esc(w); }).join(' ');

  var html =
    '<details class="ub-sel ub-cwsel"><summary aria-label="Change colourway">' +
      '<img class="ub-cookie" id="ubCookie" alt="" /><span class="ub-name" id="ubName"></span>' +
      '<span class="ub-chev" aria-hidden="true">&#9662;</span></summary>' +
    '<div class="ub-tuner">' +
      '<div class="ub-th"><span>Colour tuner</span><span class="ub-live">Live</span></div>' +
      '<div class="ub-spec"><img id="ubtCookie" alt="" /><div><div class="ub-spec-line">' + spec + '</div>' +
        '<div class="ub-spec-meta"><b id="ubtName"></b> &middot; <span id="ubtHex"></span></div></div></div>' +
      '<div class="ub-ctl-head"><span>Colourway</span><output id="ubOut"></output></div>' +
      '<input class="ub-range" type="range" id="ubRange" min="0" max="' + (list.length - 1) + '" step="1" value="0" aria-label="Colourway" />' +
      '<div class="ub-chips" id="ubChips" role="group" aria-label="Colourways"></div>' +
      '<div class="ub-acts"><button type="button" class="ub-btn" id="ubReset">Reset</button></div>' +
    '</div></details>';

  UB.ready(function () {
    UB.mount('left', html);
    var chips = document.getElementById('ubChips'), range = document.getElementById('ubRange');
    var idxOf = function (n) { for (var i = 0; i < list.length; i++) if (list[i][0] === n) return i; return 0; };

    chips.innerHTML = list.map(function (c) {
      return '<button type="button" class="ub-chip" data-cw="' + esc(c[0]) + '" role="menuitemradio" aria-checked="false" title="' + esc(c[0]) + '"><img src="' + esc(T.iconFor(c[0])) + '" alt="" /></button>';
    }).join('');
    Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
      b.addEventListener('click', function () { T.set(b.getAttribute('data-cw')); });
    });
    range.addEventListener('input', function () { T.set(list[+range.value][0]); });
    document.getElementById('ubReset').addEventListener('click', function () { T.clear(); });

    function sync() {
      var cw = window.__UBCW || {}, i = idxOf(cw.name), el;
      if (+range.value !== i) range.value = i;
      if ((el = document.getElementById('ubOut'))) el.textContent = cw.name || '';
      if ((el = document.getElementById('ubCookie')) && cw.iconUrl) el.src = cw.iconUrl;
      if ((el = document.getElementById('ubtCookie')) && cw.iconUrl) el.src = cw.iconUrl;
      if ((el = document.getElementById('ubName'))) el.textContent = cw.name || '';
      if ((el = document.getElementById('ubtName'))) el.textContent = cw.name || '';
      if ((el = document.getElementById('ubtHex'))) el.textContent = cw.accent || '';
      Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
        b.setAttribute('aria-checked', b.getAttribute('data-cw') === cw.name ? 'true' : 'false');
      });
    }
    document.addEventListener('utilbar:colour', sync);
    T.apply(T.current()); sync();
  });
})();
/*!
 * utilbar-language.js — the language dropdown. Snaps into the frame's RIGHT.
 * Needs utilbar.js loaded first, and UtilBar.languages set (a non-empty array).
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var langs = UB.languages || []; if (!langs.length) return;
  var esc = UB.esc;

  UB.css([
    '.ub-langsel>summary{color:var(--ub-muted,#6C6880);font-family:var(--ub-mono,Menlo,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;transition:color .25s}',
    '.ub-langsel[open]>summary,.ub-langsel>summary:hover{color:var(--ub-accent,#FF8DC5)}',
    '.ub-lang-menu{right:0}',
    '.ub-lang-menu .ub-all{margin-top:4px;border-top:1px solid var(--ub-line-soft,#221F2C);border-radius:0 0 7px 7px;color:var(--ub-muted,#6C6880);font-size:12.5px}'
  ].join(''));

  var cur = String(langs[0].code || 'en').toUpperCase();
  var items = langs.map(function (l) {
    return '<a role="menuitem" data-code="' + esc(l.code) + '" href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
  }).join('');
  if (UB.allRegions) items += '<a class="ub-all" href="' + esc(UB.allRegions) + '">All regions &rarr;</a>';

  var html =
    '<details class="ub-sel ub-langsel"><summary aria-label="Change language">' + esc(cur) +
      '&nbsp;<span class="ub-chev" aria-hidden="true">&#9662;</span></summary>' +
    '<div class="ub-menu ub-lang-menu" role="menu">' + items + '</div></details>';

  UB.ready(function () { UB.mount('right', html, 'language'); });
})();
/*!
 * utilbar-search.js — a search box. Snaps into the frame's RIGHT.
 * Needs utilbar.js loaded first, and UtilBar.search set:
 *   search: {
 *     placeholder: 'Search docs',
 *     action: '/search?q={q}',    // where a query goes ({q} is url-encoded), or…
 *     onSearch: function (q) {},  // …a handler you provide
 *     width: 160
 *   }
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var cfg = UB.search; if (!cfg) return;
  var esc = UB.esc;

  UB.css([
    '.ub-search{display:inline-flex;align-items:center}',
    '.ub-search input{background:var(--ub-ink-2,#14121B);border:1px solid var(--ub-line,#2C2939);border-radius:999px;color:var(--ub-text,#ECEAF2);font-family:var(--ub-sans,sans-serif);font-size:12px;padding:6px 13px;width:' + (cfg.width || 160) + 'px;outline:0;transition:border-color .2s}',
    '.ub-search input::placeholder{color:var(--ub-muted,#6C6880)}',
    '.ub-search input:focus{border-color:var(--ub-accent,#FF8DC5)}'
  ].join(''));

  UB.ready(function () {
    var form = document.createElement('form');
    form.className = 'ub-search'; form.setAttribute('role', 'search');
    form.innerHTML = '<input type="search" placeholder="' + esc(cfg.placeholder || 'Search') + '" aria-label="' + esc(cfg.placeholder || 'Search') + '" />';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = form.querySelector('input').value.trim(); if (!q) return;
      if (typeof cfg.onSearch === 'function') cfg.onSearch(q);
      else if (cfg.action) location.href = cfg.action.replace('{q}', encodeURIComponent(q));
    });
    UB.mount('right', form, 'search');
  });
})();
/*!
 * utilbar-status.js — an online/offline dot that shows whether your product is up.
 * Snaps into the frame's RIGHT. Needs utilbar.js first, and UtilBar.status set:
 *   status: {
 *     url: '/api/health',        // pinged on a heartbeat; ok response = up
 *     every: 30000,              // ms between pings (default 30s)
 *     method: 'GET',
 *     label: 'CrumbProof',       // text before the dot
 *     upLabel: 'Online', downLabel: 'Offline'
 *   }
 * With no url it falls back to the browser's own online/offline state.
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var cfg = UB.status; if (!cfg) return;
  var esc = UB.esc;

  UB.css([
    '.ub-status{display:inline-flex;align-items:center;gap:7px;font-family:var(--ub-mono,Menlo,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880)}',
    '.ub-status .ub-dot{width:7px;height:7px;border-radius:50%;background:var(--ub-muted,#6C6880);box-shadow:0 0 0 0 transparent;transition:background .3s,box-shadow .3s}',
    '.ub-status.up .ub-dot{background:#1CFF7E;box-shadow:0 0 8px -1px #1CFF7E}',
    '.ub-status.down .ub-dot{background:#FF4D4D;box-shadow:0 0 8px -1px #FF4D4D}'
  ].join(''));

  UB.ready(function () {
    var el = document.createElement('span');
    el.className = 'ub-status';
    el.innerHTML = '<span class="ub-dot" aria-hidden="true"></span><span class="ub-lbl">' + esc(cfg.label || 'Status') + '</span>';
    UB.mount('right', el, 'status');
    var lbl = el.querySelector('.ub-lbl');
    var up = cfg.upLabel || 'Online', down = cfg.downLabel || 'Offline';
    function paint(ok) { el.classList.toggle('up', ok); el.classList.toggle('down', !ok); lbl.textContent = ok ? up : down; }

    if (!cfg.url) {                                   // no endpoint -> reflect the browser's connection
      paint(navigator.onLine);
      window.addEventListener('online', function () { paint(true); });
      window.addEventListener('offline', function () { paint(false); });
      return;
    }
    UB.onBeat(function () {
      fetch(cfg.url, { method: cfg.method || 'GET', cache: 'no-store' })
        .then(function (r) { paint(r.ok); })
        .catch(function () { paint(false); });
    }, cfg.every || 30000);
  });
})();
/*!
 * utilbar-signin.js — Sign in, inside the bar. Renders a dropdown panel (so a click never
 * leaves the page and never loses the bar/tuner). Needs utilbar.js. Config:
 *   signin: {
 *     label: 'Sign in',
 *     onSubmit: function (creds, ui) { … },   // creds = {email, password};
 *                                             //   ui.message('…'), ui.close() provided
 *     action: '/api/auth/sign-in',            // …or let the default form POST here, or
 *     panel: '<form>…</form>',                // …supply your own panel markup (wire it on
 *                                             //   utilbar:ready), or
 *     href: '/admin',                         // …nothing above -> a plain navigating link.
 *     forgotHref: '/forgot'                   // optional link under the default form
 *   }
 * Auth is yours: the piece collects the fields and hands them to your onSubmit/action —
 * it never sends credentials anywhere itself.
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var cfg = UB.signin; if (!cfg) return;
  UB._signinClaimed = true;                          // frame: don't also add your own link
  var esc = UB.esc;
  var wantsPanel = cfg.panel || cfg.onSubmit || cfg.action;

  function dropStaleLink() { var s = document.querySelector('a.ub-signin'); if (s) s.remove(); }  // frame's fallback, if it beat us

  if (!wantsPanel) {                                 // plain navigating link
    UB.ready(function () { dropStaleLink(); UB.mount('right', '<a class="ub-link ub-signin" href="' + esc(cfg.href || '#') + '">' + esc(cfg.label || 'Sign in') + '</a>', 'signin'); });
    return;
  }

  UB.css([
    '.ub-si-panel{position:absolute;top:calc(100% + 9px);right:0;width:252px;background:var(--ub-surface,#1A1824);border:1px solid var(--ub-line,#2C2939);border-radius:13px;padding:15px;box-shadow:0 18px 44px -14px rgba(0,0,0,.75);z-index:30}',
    '.ub-si-form{display:flex;flex-direction:column;gap:11px}',
    '.ub-si-field{display:flex;flex-direction:column;gap:5px}',
    '.ub-si-field span{font-family:var(--ub-mono,Menlo,monospace);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880)}',
    '.ub-si-field input{background:var(--ub-ink-2,#14121B);border:1px solid var(--ub-line,#2C2939);border-radius:8px;color:var(--ub-text,#ECEAF2);font-family:var(--ub-sans,sans-serif);font-size:13.5px;padding:9px 11px;outline:0;transition:border-color .2s}',
    '.ub-si-field input:focus{border-color:var(--ub-accent,#FF8DC5)}',
    '.ub-si-btn{margin-top:2px;background:var(--ub-accent,#FF8DC5);color:var(--ub-on-accent,#160f16);border:0;border-radius:8px;font-family:var(--ub-sans,sans-serif);font-weight:700;font-size:13.5px;padding:10px;cursor:pointer;transition:filter .2s}',
    '.ub-si-btn:hover{filter:brightness(1.08)}',
    '.ub-si-forgot{font-family:var(--ub-sans,sans-serif);font-size:12px;color:var(--ub-muted,#6C6880);text-decoration:none;text-align:center}',
    '.ub-si-forgot:hover{color:var(--ub-accent,#FF8DC5)}',
    '.ub-si-msg{margin:0;font-family:var(--ub-sans,sans-serif);font-size:12px;line-height:1.4;color:#FF6B6B}',
    '.ub-si-msg:empty{display:none}'
  ].join(''));

  var custom = !!cfg.panel;
  var body = cfg.panel || (
    '<form class="ub-si-form"' + (cfg.action && !cfg.onSubmit ? ' method="post" action="' + esc(cfg.action) + '"' : '') + '>' +
      '<label class="ub-si-field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>' +
      '<label class="ub-si-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required /></label>' +
      '<button type="submit" class="ub-si-btn">' + esc(cfg.label || 'Sign in') + '</button>' +
      (cfg.forgotHref ? '<a class="ub-si-forgot" href="' + esc(cfg.forgotHref) + '">Forgot password?</a>' : '') +
      '<p class="ub-si-msg" role="alert"></p>' +
    '</form>'
  );

  var html =
    '<details class="ub-sel ub-sisel"><summary class="ub-link ub-signin" aria-label="Sign in">' + esc(cfg.label || 'Sign in') +
      '&nbsp;<span class="ub-chev" aria-hidden="true">&#9662;</span></summary>' +
    '<div class="ub-si-panel" role="dialog" aria-label="Sign in">' + body + '</div></details>';

  UB.ready(function () {
    dropStaleLink();
    UB.mount('right', html, 'signin');
    if (custom) return;                              // site wires its own panel via utilbar:ready
    var form = document.querySelector('.ub-si-panel form'); if (!form) return;
    var msg = form.querySelector('.ub-si-msg');
    var ui = {
      message: function (t) { if (msg) msg.textContent = t || ''; },
      close: function () { var d = form.closest('details'); if (d) d.removeAttribute('open'); }
    };
    if (typeof cfg.onSubmit === 'function') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        cfg.onSubmit({ email: (form.email || {}).value || '', password: (form.password || {}).value || '' }, ui);
      });
    }
    // else: cfg.action is on the form -> the browser POSTs it natively.
  });
})();
