/*!
 * Utility bar + colour tuner. House pattern, same rig as CrumbProof's: a pure
 * black strip over the site's grey ground, the mark and colourway name on the
 * left opening a tuner, account on the right.
 *
 * The tuner is a <details>, so the disclosure works before any JS runs. Inside:
 * a live spec readout, a slider to scrub the colourways, a chip grid, a reset.
 *
 * Injects its own CSS and markup, so a site includes one file. Depends on
 * theme.js, which owns the palette and the persistence; this is only a view.
 *
 * Skinned to the host site rather than copied pixel for pixel. CrumbProof is
 * rounded and set in a sans; aifreeware is square and mono, because that is
 * what aifreeware is. Same instrument, local finish.
 *
 * Deliberately NOT loaded on /run/. The terminal stays immersive: it honours a
 * saved colourway but offers no chrome to change it.
 */
(function () {
  if (!window.AIFWTheme) return;
  var T = window.AIFWTheme;
  var CW = T.list;

  var ICON = function (name) { return '/assets/favicon-' + name + '.svg'; };
  var LINE = 'rgba(255,255,255,.10)';
  var SOFT = 'rgba(255,255,255,.06)';
  var MUTED = '#6d6d6d';

  var css = [
    '.utilbar{position:relative;z-index:12;background:#000;border-bottom:1px solid ' + SOFT + '}',
    '.utilbar .in{max-width:960px;margin:0 auto;padding:0 5vw;height:34px;',
      'display:flex;align-items:center;justify-content:space-between;gap:1rem}',
    '.util-link{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;',
      'color:' + MUTED + ';text-decoration:none;background:none;border:0;cursor:pointer;padding:0;',
      'display:inline-flex;align-items:center;gap:.5em;transition:color .25s ease}',
    '.util-link:hover,.util-link:focus-visible{color:var(--accent)}',
    '.util-signin{color:var(--accent)}',

    /* trigger */
    '.cwsel{position:relative;display:inline-flex;align-items:center}',
    '.cwsel>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:7px}',
    '.cwsel>summary::-webkit-details-marker{display:none}',
    '.cwsel>summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}',
    '.cw-mark{width:16px;height:16px;display:block;image-rendering:pixelated}',
    '.cw-name{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;',
      'color:' + MUTED + ';transition:color .25s ease}',
    '.chev{font-size:9px;color:' + MUTED + ';transition:color .25s ease}',
    '.cwsel[open] .cw-name,.cwsel[open] .chev,',
    '.cwsel>summary:hover .cw-name,.cwsel>summary:hover .chev{color:var(--accent)}',

    /* the rig */
    '.cwtuner{position:absolute;top:calc(100% + 9px);left:0;width:min(92vw,384px);',
      'background:#1c1c1c;border:1px solid ' + LINE + ';',
      'box-shadow:0 22px 54px -18px rgba(0,0,0,.85);z-index:14;overflow:hidden}',
    '.cwt-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;',
      'padding:11px 16px;border-bottom:1px solid ' + SOFT + ';font-family:var(--mono);',
      'font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:' + MUTED + '}',
    '.cwt-live{color:var(--accent);display:inline-flex;align-items:center;gap:6px}',
    '.cwt-live::before{content:"";width:6px;height:6px;background:var(--accent);',
      'animation:cwtpulse 1.6s ease-in-out infinite}',
    '@keyframes cwtpulse{50%{opacity:.25}}',
    '@media (prefers-reduced-motion:reduce){.cwt-live::before{animation:none}}',

    '.cwt-spec{padding:16px;display:flex;align-items:center;gap:14px;border-bottom:1px solid ' + SOFT + '}',
    '.cwt-spec img{width:52px;height:52px;image-rendering:pixelated;flex:none}',
    '.cwt-spec-txt{min-width:0}',
    '.cwt-spec-line{font-family:var(--mono);font-size:14px;line-height:1.3;color:#d8d8d8;letter-spacing:-.01em}',
    '.cwt-acc{color:var(--accent)}',
    '.cwt-spec-meta{margin-top:7px;font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;',
      'text-transform:uppercase;color:' + MUTED + ';font-variant-numeric:tabular-nums}',
    '.cwt-spec-meta b{color:#e8e8e8;font-weight:400}',

    '.cwt-ctl{padding:15px 16px 4px}',
    '.cwt-ctl-head{display:flex;justify-content:space-between;align-items:baseline;',
      'font-family:var(--mono);font-size:10px;letter-spacing:.07em;text-transform:uppercase;',
      'color:' + MUTED + ';margin-bottom:9px}',
    '.cwt-ctl-head output{color:var(--accent)}',
    '.cwt-range{-webkit-appearance:none;appearance:none;width:100%;height:15px;',
      'background:transparent;cursor:ew-resize;display:block}',
    '.cwt-range::-webkit-slider-runnable-track{height:3px;background:' + LINE + '}',
    '.cwt-range::-moz-range-track{height:3px;background:' + LINE + '}',
    '.cwt-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:9px;height:15px;',
      'background:var(--accent);border:0;margin-top:-6px}',
    '.cwt-range::-moz-range-thumb{width:9px;height:15px;background:var(--accent);border:0;border-radius:0}',
    '.cwt-range:focus-visible{outline:none}',
    '.cwt-range:focus-visible::-webkit-slider-thumb{outline:2px solid var(--accent);outline-offset:3px}',

    '.cwt-chips{display:grid;grid-template-columns:repeat(7,1fr);justify-items:center;',
      'gap:8px 4px;padding:13px 16px 8px}',
    '.cwt-chip{width:28px;height:28px;padding:0;background:none;border:1px solid transparent;',
      'cursor:pointer;display:inline-flex;align-items:center;justify-content:center;',
      'transition:border-color .16s ease,transform .16s ease}',
    '.cwt-chip img{width:20px;height:20px;image-rendering:pixelated;display:block}',
    '.cwt-chip:hover{transform:translateY(-1px)}',
    '.cwt-chip[aria-checked="true"]{border-color:var(--accent)}',
    '.cwt-chip:focus-visible{outline:2px solid var(--accent);outline-offset:1px}',

    '.cwt-actions{display:flex;gap:8px;padding:12px 16px 14px;border-top:1px solid ' + SOFT + '}',
    '.cwt-btn{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;',
      'color:#d8d8d8;background:#252525;border:1px solid ' + LINE + ';padding:8px 12px;',
      'cursor:pointer;transition:opacity .16s ease}',
    '.cwt-btn:hover{opacity:.62}',
    '.cwt-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '@media (max-width:420px){.cwt-chips{grid-template-columns:repeat(5,1fr)}}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var start = T.current();
  var chips = CW.map(function (c) {
    return '<button type="button" class="cwt-chip" role="radio" aria-checked="false" '
         + 'data-cw-set="' + c[0] + '" title="' + c[0] + '">'
         + '<img src="' + ICON(c[0]) + '" alt="' + c[0] + '" width="20" height="20"></button>';
  }).join('');

  var bar = document.createElement('div');
  bar.className = 'utilbar';
  bar.innerHTML =
    '<div class="in">'
  +   '<details class="cwsel" id="cwSel">'
  +     '<summary aria-label="Change the site colour">'
  +       '<img class="cw-mark" id="cwMark" src="' + ICON(start) + '" alt="" width="16" height="16">'
  +       '<span class="cw-name" id="cwName">' + start + '</span>'
  +       '<span class="chev" aria-hidden="true">&#9662;</span>'
  +     '</summary>'
  +     '<div class="cwtuner" id="cwMenu">'
  +       '<div class="cwt-head"><span>aifreeware / Colour tuner</span><span class="cwt-live">Live</span></div>'
  +       '<div class="cwt-spec">'
  +         '<img id="cwtMark" src="' + ICON(start) + '" alt="" width="52" height="52">'
  +         '<div class="cwt-spec-txt">'
  +           '<div class="cwt-spec-line">Everything runs on <span class="cwt-acc">your own machine.</span></div>'
  +           '<div class="cwt-spec-meta"><b id="cwtName">' + start + '</b> &middot; <span id="cwtHex"></span></div>'
  +         '</div>'
  +       '</div>'
  +       '<div class="cwt-ctl">'
  +         '<div class="cwt-ctl-head"><label for="cwtRange">Colourway</label><output id="cwtOut">' + start + '</output></div>'
  +         '<input class="cwt-range" type="range" id="cwtRange" min="0" max="' + (CW.length - 1) + '" step="1" value="0" aria-label="Colourway">'
  +       '</div>'
  +       '<div class="cwt-chips" id="cwtChips" role="radiogroup" aria-label="Colourway">' + chips + '</div>'
  +       '<div class="cwt-actions"><button type="button" class="cwt-btn" id="cwtReset">Reset</button></div>'
  +     '</div>'
  +   '</details>'
  +   '<span id="acctSlot"><a class="util-link util-signin" href="/run/">Sign in</a></span>'
  + '</div>';

  function indexOf(name) {
    for (var i = 0; i < CW.length; i++) { if (CW[i][0] === name) return i; }
    return 0;
  }

  function mount() {
    document.body.insertBefore(bar, document.body.firstChild);

    var sel = document.getElementById('cwSel');
    var range = document.getElementById('cwtRange');
    var chipbox = document.getElementById('cwtChips');

    // Everything that has to follow the colour, in one place. theme.js fires the
    // event whether the change came from the slider, a chip or another tab.
    function sync(d) {
      var name = d.name, i = indexOf(name);
      var el;
      if ((el = document.getElementById('cwMark'))) el.src = ICON(name);
      if ((el = document.getElementById('cwtMark'))) el.src = ICON(name);
      if ((el = document.getElementById('cwName'))) el.textContent = name;
      if ((el = document.getElementById('cwtName'))) el.textContent = name;
      if ((el = document.getElementById('cwtOut'))) el.value = name;
      if ((el = document.getElementById('cwtHex'))) el.textContent = d.accent;
      if (range && String(range.value) !== String(i)) range.value = i;
      var all = chipbox.querySelectorAll('[data-cw-set]');
      for (var k = 0; k < all.length; k++) {
        all[k].setAttribute('aria-checked', all[k].getAttribute('data-cw-set') === name ? 'true' : 'false');
      }
    }

    document.addEventListener('aifw-colourway', function (e) { sync(e.detail); });

    range.addEventListener('input', function () { T.set(CW[Number(range.value)][0]); });

    chipbox.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-cw-set]');
      if (!chip) return;
      T.set(chip.getAttribute('data-cw-set'));
    });

    document.getElementById('cwtReset').addEventListener('click', function () { T.clear(); });

    // A <details> does not close on outside click or Escape by itself.
    document.addEventListener('click', function (e) { if (!sel.contains(e.target)) sel.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sel.open = false; });

    sync(T.apply(T.current()));
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
