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
