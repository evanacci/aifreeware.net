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

  // Defer to let same-tick piece scripts register their ready() callbacks first.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else setTimeout(build, 0);
})();
