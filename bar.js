/*!
 * Utility bar + colour tuner. A COPY of CrumbProof's, not a reimplementation.
 *
 * Source of truth is crumbproof/public/index.html: the .utilbar rules in its
 * <style> block, the <div class="utilbar"> markup at the top of its <body>, and
 * the inline "colour tuner" IIFE. Copied as-is, including CrumbProof's own
 * comments and formatting, so a diff between the two sites means something.
 * Do not tidy this. Fix it in CrumbProof first, then re-copy.
 *
 * The permitted deviations, and only these:
 *   1. var(--pink) -> var(--accent). theme.js sets --accent / --accent-deep /
 *      --on-accent and that trio is the whole contract. (aifreeware separately
 *      defines a static --pink that is NOT the accent, so this is mandatory.)
 *   2. Icon source. /16bit/crumbproof-icon-<name>.svg -> /assets/favicon-<name>.svg.
 *      Same sizes, same image-rendering: pixelated, same ids (cwCookie, cwtCookie).
 *   3. Theme object. CPTheme -> AIFWTheme, __CPCW -> __AIFWCW, and the event
 *      'cp-colourway' -> 'aifw-colourway'.
 *   4. Tokens CrumbProof defines and aifreeware does not (--surface, --line,
 *      --line-soft, --muted-2, --ink-2, --ease, --sans, --text) keep their var()
 *      and gain a fallback, so a host that defines the token still wins.
 *   5. Copy inside the bar: the tuner header and the spec line are aifreeware's.
 *      Same markup shape, one word per span with the last span accented.
 *   6. .utilbar is position: relative, not absolute. Reason is on the rule.
 *   7. The language selector is dropped whole. aifreeware has no i18n.
 *   8. 13 colourways here against CrumbProof's 12, so the slider's max and every
 *      count come off list.length.
 *
 * Three things are aifreeware's alone and have no CrumbProof equivalent. All are
 * marked AIFW-ONLY where they appear: the #acctSlot wrapper and paintAccount(),
 * the #cwCookie line in sync(), and the zero-specificity .wrap fallback.
 *
 * Depends on theme.js, which owns the palette and the persistence. This is only a
 * view onto it. Not loaded on /run/: the terminal stays immersive.
 */
(function () {
  var T = window.AIFWTheme;
  if (!T) return;
  var list = T.list;

  var css = `
  /* topbar */
  /* DIVERGENCE, the only one in the copied CSS: CrumbProof says position: absolute
     because it floats this over a hero that reserves the 34px. aifreeware has no
     such hero, so the bar sits in normal flow instead. top/left stay for the diff. */
  .utilbar { position: relative; top: 0; left: 0; width: 100%; z-index: 6; background: #000; border-bottom: 1px solid var(--line-soft, rgba(255,255,255,.07)); }
  .util-wrap { display: flex; align-items: center; justify-content: space-between; height: 34px; }
  .util-right { display: flex; align-items: center; gap: 22px; }
  .util-link { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted-2, #6d6d6d); text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; display: inline-flex; align-items: center; transition: color .25s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .util-link:hover, .util-link:focus-visible { color: var(--accent); outline: none; }
  .util-signin { color: var(--accent); }

  /* colourway tuner trigger (left of the utility bar) */
  .cwsel { position: relative; display: inline-flex; align-items: center; }
  .cwsel > summary { list-style: none; display: inline-flex; align-items: center; gap: 7px; line-height: 1; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .cwsel > summary::-webkit-details-marker { display: none; }
  .cw-cookie { width: 18px; height: 18px; display: block; image-rendering: pixelated; }
  .cw-name { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted-2, #6d6d6d); transition: color .25s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwsel .chev { font-size: 9px; opacity: .8; color: var(--muted-2, #6d6d6d); transition: color .25s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwsel[open] .cw-name, .cwsel > summary:hover .cw-name, .cwsel > summary:focus-visible .cw-name,
  .cwsel[open] .chev, .cwsel > summary:hover .chev { color: var(--accent); }
  .cwsel > summary:focus-visible { outline: none; }

  /* the tuner rig — a colour-measuring instrument in the Birukoff idiom, skinned to our dark */
  .cwtuner { position: absolute; top: calc(100% + 9px); left: 0; width: min(92vw, 384px); background: var(--surface, #1c1c1c); border: 1px solid var(--line, rgba(255,255,255,.12)); border-radius: 6px; box-shadow: 0 22px 54px -18px rgba(0,0,0,.8); z-index: 12; overflow: hidden; }
  .cwt-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line-soft, rgba(255,255,255,.07)); font-family: var(--mono); font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--muted-2, #6d6d6d); }
  .cwt-live { color: var(--accent); display: inline-flex; align-items: center; gap: 6px; }
  .cwt-live::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
  .cwt-spec { padding: 18px 16px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--line-soft, rgba(255,255,255,.07)); }
  .cwt-spec img { width: 56px; height: 56px; image-rendering: pixelated; flex: none; }
  .cwt-spec-txt { min-width: 0; }
  .cwt-spec-line { display: flex; flex-wrap: wrap; gap: 0 5px; align-items: center; font-family: var(--sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif); font-weight: 700; font-size: 17px; letter-spacing: -.02em; line-height: 1.15; }
  .cwt-acc { color: var(--accent); }
  .cwt-spec-meta { margin-top: 7px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted-2, #6d6d6d); font-variant-numeric: tabular-nums; }
  .cwt-spec-meta b { color: var(--text, #ececec); font-weight: 400; }
  .cwt-ctl { padding: 16px 16px 4px; }
  .cwt-ctl-head { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--mono); font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--muted-2, #6d6d6d); margin-bottom: 9px; }
  .cwt-ctl-head output { color: var(--accent); font-variant-numeric: tabular-nums; }
  .cwt-range { -webkit-appearance: none; appearance: none; width: 100%; height: 15px; background: transparent; cursor: ew-resize; display: block; }
  .cwt-range::-webkit-slider-runnable-track { height: 1px; background: var(--line, rgba(255,255,255,.12)); }
  .cwt-range::-moz-range-track { height: 1px; background: var(--line, rgba(255,255,255,.12)); }
  .cwt-range::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: var(--accent); margin-top: -5px; transition: transform .16s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwt-range::-moz-range-thumb { width: 11px; height: 11px; border: 0; border-radius: 50%; background: var(--accent); transition: transform .16s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwt-range:hover::-webkit-slider-thumb { transform: scale(1.35); }
  .cwt-range:hover::-moz-range-thumb { transform: scale(1.35); }
  .cwt-range:focus-visible { outline: none; }
  .cwt-range:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--accent); outline-offset: 3px; }
  /* 12 chips as an even 6 x 2 grid so none is ever orphaned on its own row */
  /* aifreeware runs 13, so the 13th does sit alone. Left as CrumbProof has it:
     changing the grid here would be a redesign, and it belongs upstream anyway. */
  .cwt-chips { display: grid; grid-template-columns: repeat(6, 1fr); justify-items: center; gap: 9px 4px; padding: 14px 16px 8px; }
  .cwt-chip { width: 30px; height: 30px; padding: 0; background: none; border: 1px solid transparent; border-radius: 7px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: border-color .16s var(--ease, cubic-bezier(.16, 1, .3, 1)), transform .16s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwt-chip img { width: 22px; height: 22px; image-rendering: pixelated; }
  .cwt-chip:hover { transform: translateY(-1px); }
  .cwt-chip[aria-checked="true"] { border-color: var(--accent); }
  .cwt-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .cwt-actions { display: flex; gap: 8px; padding: 14px 16px; }
  .cwt-btn { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--text, #ececec); background: var(--ink-2, #252525); border: 1px solid var(--line, rgba(255,255,255,.12)); border-radius: 7px; padding: 8px 12px; cursor: pointer; transition: opacity .16s var(--ease, cubic-bezier(.16, 1, .3, 1)); }
  .cwt-btn:hover { opacity: .62; }
  .cwt-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  @media (max-width: 520px) {
    /* Keep the top bar light on a phone — cookie icon only, drop the colourway word. */
    .cw-name { display: none; }
    .cwtuner { width: min(94vw, 360px); }
  }

  /* ---- AIFW-ONLY below this line. Nothing here is CrumbProof's. ----
     CrumbProof's .util-wrap takes its max-width and gutter from that site's global
     .wrap utility, which every CrumbProof page defines. On aifreeware only the home
     page defines a bare .wrap; /login and /reset scope theirs to .chrome, so the bar
     would go edge to edge there. Restated at zero specificity via :where(), so any
     real .wrap rule on the host still wins, same principle as the token fallbacks.
     Delete this once /login and /reset define .wrap themselves. */
  :where(.utilbar .wrap) { max-width: 960px; margin: 0 auto; padding: 0 5vw; }
`;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* CrumbProof ships this markup pre-rendered with its page default baked in
     (lagoon, #1CFFFF, slider index 4). Injected, the same four values have to come
     off the live colourway instead. Everything else is its markup unchanged. */
  var cw0 = window.__AIFWCW || {};
  var start = cw0.name || T.current();
  var startHex = cw0.accent || '';
  var startIdx = 0;
  for (var s0 = 0; s0 < list.length; s0++) if (list[s0][0] === start) startIdx = s0;

  var html = `
  <div class="utilbar">
    <div class="wrap util-wrap">
      <div class="util-left">
        <details class="cwsel">
          <summary aria-label="Change the site colour">
            <img class="cw-cookie" id="cwCookie" src="/assets/favicon-${start}.svg" alt="" width="18" height="18" />
            <span class="cw-name" id="cwName">${start}</span>
            <span class="chev" aria-hidden="true">&#9662;</span>
          </summary>
          <div class="cwtuner" id="cwTuner">
            <div class="cwt-head"><span>aifreeware / Colour tuner</span><span class="cwt-live">Live</span></div>
            <div class="cwt-spec">
              <img id="cwtCookie" src="/assets/favicon-${start}.svg" alt="" width="56" height="56" />
              <div class="cwt-spec-txt">
                <div class="cwt-spec-line"><span>Everything</span> <span>runs</span> <span>on</span> <span class="cwt-acc">your own machine.</span></div>
                <div class="cwt-spec-meta"><b id="cwtName">${start}</b> &middot; <span id="cwtHex">${startHex}</span></div>
              </div>
            </div>
            <div class="cwt-ctl">
              <div class="cwt-ctl-head"><label for="cwtRange">Colourway</label><output id="cwtOut">${start}</output></div>
              <input class="cwt-range" type="range" id="cwtRange" min="0" max="${list.length - 1}" step="1" value="${startIdx}" aria-label="Colourway" />
            </div>
            <div class="cwt-chips" id="cwtChips" role="group" aria-label="Colourways"></div>
            <div class="cwt-actions">
              <button type="button" class="cwt-btn" id="cwtReset">Reset</button>
            </div>
          </div>
        </details>
      </div>
      <div class="util-right">
        <!-- AIFW-ONLY wrapper. CrumbProof has the bare <a> here; paintAccount()
             swaps this span's contents for the signed-in email. -->
        <span id="acctSlot"><a class="util-link util-signin" href="/login/" data-i18n="signin">Sign in</a></span>
      </div>
    </div>
  </div>
`;

  function mount() {
    document.body.insertAdjacentHTML('afterbegin', html);

    /* ---- colour tuner: slider scrubs the 12 colourways live, chips jump, reset to page default ---- */
    /* The 12 in CrumbProof's comments is its count. aifreeware carries 13, so every
       number below is read off list.length rather than written down. */
    (function () {
      var T = window.AIFWTheme; if (!T) return;
      var list = T.list, sel = document.querySelector('.cwsel');
      var range = document.getElementById('cwtRange'), out = document.getElementById('cwtOut'),
          chips = document.getElementById('cwtChips');
      function idxOf(n) { for (var i = 0; i < list.length; i++) if (list[i][0] === n) return i; return 0; }

      /* the cookie chips — a visible choice of colours, set as a flex row of bordered marks */
      if (chips) {
        var ch = '';
        for (var i = 0; i < list.length; i++) { var n = list[i][0];
          ch += '<button type="button" class="cwt-chip" data-cw="' + n + '" role="menuitemradio" aria-checked="false" title="' + n + '"><img src="/assets/favicon-' + n + '.svg" alt="" width="20" height="20" /></button>'; }
        chips.innerHTML = ch;
        Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
          b.addEventListener('click', function () { T.set(b.getAttribute('data-cw')); });
        });
      }

      /* reflect the active colourway across every part of the tuner */
      function sync() {
        var cw = window.__AIFWCW || {}, name = cw.name, i = idxOf(name), el;
        if (range && +range.value !== i) range.value = i;
        if (out) out.textContent = name;
        if ((el = document.getElementById('cwtCookie'))) el.src = cw.iconUrl || el.src;
        if ((el = document.getElementById('cwtName'))) el.textContent = name;
        if ((el = document.getElementById('cwtHex'))) el.textContent = cw.accent || '';
        if (chips) Array.prototype.forEach.call(chips.querySelectorAll('[data-cw]'), function (b) {
          b.setAttribute('aria-checked', b.getAttribute('data-cw') === name ? 'true' : 'false'); });
      }

      /* the slider tunes the colourway — scrub the 12, live */
      if (range) range.addEventListener('input', function () { T.set(list[+range.value][0]); });
      var resetBtn = document.getElementById('cwtReset');
      if (resetBtn) resetBtn.addEventListener('click', function () { T.clear(); });
      document.addEventListener('aifw-colourway', sync);

      /* paint the hero + menu cookies + tuner now that the DOM exists */
      T.apply(T.current());
      sync();
      /* the big hero cookie opens the tuner too */
      var hero = document.getElementById('cookie');
      if (hero && sel) {
        var toggleTray = function () { sel.open = !sel.open; if (sel.open) { var s = sel.querySelector('summary'); if (s) s.focus(); } };
        hero.addEventListener('click', toggleTray);
        hero.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTray(); } });
      }
      document.addEventListener('click', function (e) {
        if (sel && sel.hasAttribute('open') && !sel.contains(e.target) && !(hero && hero.contains(e.target))) sel.removeAttribute('open');
      });
    })();

    paintAccount();
  }

  /* AIFW-ONLY, no CrumbProof equivalent. The account only means anything inside the
     terminal, so this reports state and hands off rather than duplicating the
     sign-in panel that lives there. */
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
