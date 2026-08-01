/*!
 * Utility bar + colour tuner. HOUSE COMPONENT.
 *
 * The CSS, the markup and the wiring are CrumbProof's, taken as they are rather
 * than reimplemented, so the two sites are the same component and a diff between
 * them means something. Class names, element ids and the data-cw attribute all
 * match cp-theme's tuner exactly.
 *
 * Made portable in two ways, and only these two:
 *   1. Every CrumbProof token carries a fallback, so this runs on a site that
 *      has never heard of --surface or --ink-2. A host that defines them wins.
 *   2. --pink became --accent, which is the canonical name theme.js sets. That
 *      trio (--accent, --accent-deep, --on-accent) is the whole contract.
 *
 * One deliberate divergence: .utilbar is position:relative here, not absolute.
 * CrumbProof floats it over a hero that reserves the space; in flow is the safe
 * default for a site that does not. A host can override in one rule.
 *
 * Depends on theme.js, which owns the palette and the persistence. This is only
 * a view onto it. Not loaded on /run/: the terminal stays immersive.
 */
(function () {
  var T = window.AIFWTheme || window.CPTheme;
  if (!T) return;
  var list = T.list;

  // Per-site: where a colourway's mark lives, and what the spec line reads.
  var ICON  = function (n) { return '/assets/favicon-' + n + '.svg'; };
  var TITLE = 'aifreeware / Colour tuner';
  var SPEC  = ['Everything', 'runs', 'on', 'your', 'own'];
  var SPEC_ACC = 'machine.';

  var css = [
    '.utilbar{position:relative;width:100%;z-index:6;background:#000;',
      'border-bottom:1px solid var(--line-soft,rgba(255,255,255,.07))}',
    '.util-wrap{display:flex;align-items:center;justify-content:space-between;height:34px;',
      'max-width:960px;margin:0 auto;padding:0 5vw}',
    '.util-right{display:flex;align-items:center;gap:22px}',
    '.util-link{font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;letter-spacing:.12em;',
      'text-transform:uppercase;color:var(--muted-2,#6d6d6d);text-decoration:none;background:none;',
      'border:0;cursor:pointer;padding:0;display:inline-flex;align-items:center;',
      'transition:color .25s var(--ease,ease)}',
    '.util-link:hover,.util-link:focus-visible{color:var(--accent);outline:none}',
    '.util-signin{color:var(--accent)}',

    '.cwsel{position:relative;display:inline-flex;align-items:center}',
    '.cwsel>summary{list-style:none;display:inline-flex;align-items:center;gap:7px;line-height:1;',
      'cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.cwsel>summary::-webkit-details-marker{display:none}',
    '.cw-cookie{width:18px;height:18px;display:block;image-rendering:pixelated}',
    '.cw-name{font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;letter-spacing:.12em;',
      'text-transform:uppercase;color:var(--muted-2,#6d6d6d);transition:color .25s var(--ease,ease)}',
    '.cwsel .chev{font-size:9px;opacity:.8;color:var(--muted-2,#6d6d6d);transition:color .25s var(--ease,ease)}',
    '.cwsel[open] .chev,.cwsel>summary:hover .chev,',
    '.cwsel[open] .cw-name,.cwsel>summary:hover .cw-name{color:var(--accent)}',
    '.cwsel>summary:focus-visible{outline:none}',
    '.cwsel>summary:focus-visible .cw-name{outline:2px solid var(--accent);outline-offset:3px}',

    '.cwtuner{position:absolute;top:calc(100% + 9px);left:0;width:min(94vw,360px);',
      'background:var(--surface,#1c1c1c);border:1px solid var(--line,rgba(255,255,255,.12));',
      'border-radius:6px;box-shadow:0 22px 54px -18px rgba(0,0,0,.8);z-index:12;overflow:hidden}',
    '.cwt-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px;',
      'border-bottom:1px solid var(--line-soft,rgba(255,255,255,.07));',
      'font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;letter-spacing:.09em;',
      'text-transform:uppercase;color:var(--muted-2,#6d6d6d)}',
    '.cwt-live{color:var(--accent);display:inline-flex;align-items:center;gap:6px}',
    '.cwt-live::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}',
    '.cwt-spec{padding:18px 16px;display:flex;align-items:center;gap:14px;',
      'border-bottom:1px solid var(--line-soft,rgba(255,255,255,.07))}',
    '.cwt-spec img{width:56px;height:56px;image-rendering:pixelated;flex:none}',
    '.cwt-spec-txt{min-width:0}',
    '.cwt-spec-line{display:flex;flex-wrap:wrap;gap:0 5px;align-items:center;',
      'font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);',
      'font-weight:700;font-size:17px;letter-spacing:-.02em;line-height:1.15;color:var(--text,#ececec)}',
    '.cwt-acc{color:var(--accent)}',
    '.cwt-spec-meta{margin-top:7px;font-family:var(--mono,ui-monospace,monospace);font-size:10.5px;',
      'letter-spacing:.04em;text-transform:uppercase;color:var(--muted-2,#6d6d6d);',
      'font-variant-numeric:tabular-nums}',
    '.cwt-spec-meta b{color:var(--text,#ececec);font-weight:400}',
    '.cwt-ctl{padding:16px 16px 4px}',
    '.cwt-ctl-head{display:flex;justify-content:space-between;align-items:baseline;',
      'font-family:var(--mono,ui-monospace,monospace);font-size:10px;letter-spacing:.07em;',
      'text-transform:uppercase;color:var(--muted-2,#6d6d6d);margin-bottom:9px}',
    '.cwt-ctl-head output{color:var(--accent);font-variant-numeric:tabular-nums}',
    '.cwt-range{-webkit-appearance:none;appearance:none;width:100%;height:15px;background:transparent;',
      'cursor:ew-resize;display:block}',
    '.cwt-range::-webkit-slider-runnable-track{height:1px;background:var(--line,rgba(255,255,255,.12))}',
    '.cwt-range::-moz-range-track{height:1px;background:var(--line,rgba(255,255,255,.12))}',
    '.cwt-range::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;',
      'background:var(--accent);margin-top:-5px;transition:transform .16s var(--ease,ease)}',
    '.cwt-range::-moz-range-thumb{width:11px;height:11px;border:0;border-radius:50%;',
      'background:var(--accent);transition:transform .16s var(--ease,ease)}',
    '.cwt-range:hover::-webkit-slider-thumb{transform:scale(1.35)}',
    '.cwt-range:hover::-moz-range-thumb{transform:scale(1.35)}',
    '.cwt-range:focus-visible{outline:none}',
    '.cwt-range:focus-visible::-webkit-slider-thumb{outline:2px solid var(--accent);outline-offset:3px}',
    '.cwt-chips{display:grid;grid-template-columns:repeat(6,1fr);justify-items:center;gap:9px 4px;',
      'padding:14px 16px 8px}',
    '.cwt-chip{width:30px;height:30px;padding:0;background:none;border:1px solid transparent;',
      'border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;',
      'transition:border-color .16s var(--ease,ease),transform .16s var(--ease,ease)}',
    '.cwt-chip img{width:22px;height:22px;image-rendering:pixelated}',
    '.cwt-chip:hover{transform:translateY(-1px)}',
    '.cwt-chip[aria-checked="true"]{border-color:var(--accent)}',
    '.cwt-chip:focus-visible{outline:2px solid var(--accent);outline-offset:1px}',
    '.cwt-actions{display:flex;gap:8px;padding:14px 16px}',
    '.cwt-btn{font-family:var(--mono,ui-monospace,monospace);font-size:10px;letter-spacing:.08em;',
      'text-transform:uppercase;color:var(--text,#ececec);background:var(--ink-2,#252525);',
      'border:1px solid var(--line,rgba(255,255,255,.12));border-radius:7px;padding:8px 12px;',
      'cursor:pointer;transition:opacity .16s var(--ease,ease)}',
    '.cwt-btn:hover{opacity:.62}',
    '.cwt-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var start = T.current();
  var specLine = SPEC.map(function (w) { return '<span>' + w + '</span>'; }).join(' ')
               + ' <span class="cwt-acc">' + SPEC_ACC + '</span>';

  var bar = document.createElement('div');
  bar.className = 'utilbar';
  bar.innerHTML =
    '<div class="wrap util-wrap">'
  +   '<div class="util-left">'
  +     '<details class="cwsel">'
  +       '<summary aria-label="Change the site colour">'
  +         '<img class="cw-cookie" id="cwCookie" src="' + ICON(start) + '" alt="" width="18" height="18" />'
  +         '<span class="cw-name" id="cwName">' + start + '</span>'
  +         '<span class="chev" aria-hidden="true">&#9662;</span>'
  +       '</summary>'
  +       '<div class="cwtuner" id="cwTuner">'
  +         '<div class="cwt-head"><span>' + TITLE + '</span><span class="cwt-live">Live</span></div>'
  +         '<div class="cwt-spec">'
  +           '<img id="cwtCookie" src="' + ICON(start) + '" alt="" width="56" height="56" />'
  +           '<div class="cwt-spec-txt">'
  +             '<div class="cwt-spec-line">' + specLine + '</div>'
  +             '<div class="cwt-spec-meta"><b id="cwtName">' + start + '</b> &middot; <span id="cwtHex"></span></div>'
  +           '</div>'
  +         '</div>'
  +         '<div class="cwt-ctl">'
  +           '<div class="cwt-ctl-head"><label for="cwtRange">Colourway</label><output id="cwtOut">' + start + '</output></div>'
  +           '<input class="cwt-range" type="range" id="cwtRange" min="0" max="' + (list.length - 1) + '" step="1" value="0" aria-label="Colourway" />'
  +         '</div>'
  +         '<div class="cwt-chips" id="cwtChips" role="group" aria-label="Colours"></div>'
  +         '<div class="cwt-actions"><button type="button" class="cwt-btn" id="cwtReset">Reset</button></div>'
  +       '</div>'
  +     '</details>'
  +   '</div>'
  +   '<div class="util-right"><span id="acctSlot">'
  +     '<a class="util-link util-signin" href="/run/">Sign in</a></span></div>'
  + '</div>';

  function mount() {
    document.body.insertBefore(bar, document.body.firstChild);

    /* ---- colour tuner: slider scrubs the colourways live, chips jump, reset to
       page default. Lifted from CrumbProof's inline tuner script. ---- */
    var sel = document.querySelector('.cwsel');
    var range = document.getElementById('cwtRange'),
        out = document.getElementById('cwtOut'),
        chips = document.getElementById('cwtChips');

    function idxOf(n) { for (var i = 0; i < list.length; i++) if (list[i][0] === n) return i; return 0; }

    if (chips) {
      var ch = '';
      for (var i = 0; i < list.length; i++) {
        var n = list[i][0];
        ch += '<button type="button" class="cwt-chip" data-cw="' + n + '" role="menuitemradio" aria-checked="false" title="' + n + '">'
            + '<img src="' + ICON(n) + '" alt="" width="22" height="22" /></button>';
      }
      chips.innerHTML = ch;
      Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
        b.addEventListener('click', function () { T.set(b.getAttribute('data-cw')); });
      });
    }

    function sync() {
      var cw = window.__AIFWCW || {}, name = cw.name, i = idxOf(name), el;
      if (range && +range.value !== i) range.value = i;
      if (out) out.textContent = name;
      if ((el = document.getElementById('cwCookie'))) el.src = cw.iconUrl || el.src;
      if ((el = document.getElementById('cwtCookie'))) el.src = cw.iconUrl || el.src;
      if ((el = document.getElementById('cwName'))) el.textContent = name;
      if ((el = document.getElementById('cwtName'))) el.textContent = name;
      if ((el = document.getElementById('cwtHex'))) el.textContent = cw.accent || '';
      if (chips) Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
        b.setAttribute('aria-checked', b.getAttribute('data-cw') === name ? 'true' : 'false');
      });
    }

    if (range) range.addEventListener('input', function () { T.set(list[+range.value][0]); });
    var resetBtn = document.getElementById('cwtReset');
    if (resetBtn) resetBtn.addEventListener('click', function () { T.clear(); });
    document.addEventListener('aifw-colourway', sync);

    T.apply(T.current());
    sync();

    document.addEventListener('click', function (e) {
      if (sel && sel.hasAttribute('open') && !sel.contains(e.target)) sel.open = false;
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) sel.open = false; });

    paintAccount();
  }

  /* The account only means anything inside the terminal, so this reports state
     and hands off rather than duplicating the sign-in panel that lives there. */
  function paintAccount() {
    fetch('/api/auth/get-session', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.user) return;
        var slot = document.getElementById('acctSlot');
        if (!slot) return;
        var a = document.createElement('a');
        a.className = 'util-link';
        a.href = '/run/';
        a.textContent = d.user.email;
        slot.textContent = '';
        slot.appendChild(a);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
