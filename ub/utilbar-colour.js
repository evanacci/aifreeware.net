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
