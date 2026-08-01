/*!
 * Colourway picker. House pattern, ported from CrumbProof's cp-theme.js.
 *
 * Only the accent moves. The background stays #171717 and the ANSI Shadow art
 * is drawn with the accent variable, so a colourway recolours the wordmark and
 * nothing else. No layout, no type, no art changes.
 *
 * Sets three canonical variables on :root, which is the whole contract another
 * site needs to honour: --accent, --accent-deep, --on-accent. A site keeps its
 * own legacy name by aliasing it once in CSS (aifreeware does --lime).
 *
 * With no saved pick each page owns a colour. A pick wins everywhere and sticks.
 *
 * MUST be loaded synchronously in <head>. Deferring it means the default paints
 * first and the chosen colour snaps in afterwards, which is the one thing that
 * makes a picker feel cheap.
 */
(function () {
  /* [name, accent] — same names and values as CrumbProof, plus acid-rain,
     which is aifreeware's own lime and the reason the sets are not identical
     until CrumbProof takes it too. */
  var CW = [
    ['acid-rain', '#e2f79c'],
    ['berry',     '#FF8DC5'],
    ['punch',     '#F2379D'],
    ['neon',      '#E11CFF'],
    ['orchid',    '#E57DFC'],
    ['lagoon',    '#1CFFFF'],
    ['reef',      '#37F2D2'],
    ['jade',      '#24FFCC'],
    ['acid',      '#1CFF7E'],
    ['sprout',    '#80FFC0'],
    ['cobalt',    '#027CF6'],
    ['glacier',   '#7DFCE0'],
    ['taffy',     '#FC7DB2']
  ];

  // The front door stays acid-rain because the colour is the brand here. The
  // other pages get one of their own. Anything unlisted falls to a stable hash,
  // so a new page picks a colour and keeps it rather than flickering per visit.
  var PATHS = { '/': 'acid-rain', '/run': 'acid-rain', '/reset': 'lagoon' };
  var STORE = 'aifw-cw';

  function idx(name) {
    for (var j = 0; j < CW.length; j++) { if (CW[j][0] === name) return j; }
    return -1;
  }

  // Darken for the pressed/secondary tone.
  function dk(hex, f) {
    var s = hex.slice(1);
    var r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
    function p(v) { return ('0' + Math.max(0, Math.round(v * (1 - f))).toString(16)).slice(-2); }
    return '#' + p(r) + p(g) + p(b);
  }

  // Readable ink for text sitting ON the accent. Several of these colourways are
  // very light and several are not, so this has to be computed, not assumed.
  function on(hex) {
    var s = hex.slice(1);
    var r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? '#171717' : '#ffffff';
  }

  function pageDefault() {
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var name = PATHS[path];
    if (!name) {
      var h = 2166136261;
      for (var i = 0; i < path.length; i++) { h ^= path.charCodeAt(i); h = (h * 16777619) >>> 0; }
      name = CW[h % CW.length][0];
    }
    return name;
  }

  function saved() {
    try { var v = localStorage.getItem(STORE); return (v && idx(v) >= 0) ? v : null; }
    catch (e) { return null; }
  }

  var current = saved() || pageDefault();

  function apply(name) {
    var i = idx(name);
    if (i < 0) { i = idx(pageDefault()); if (i < 0) i = 0; }
    var c = CW[i], root = document.documentElement;

    root.style.setProperty('--accent', c[1]);
    root.style.setProperty('--accent-deep', dk(c[1], 0.28));
    root.style.setProperty('--on-accent', on(c[1]));
    root.setAttribute('data-cw', c[0]);

    var icon = location.origin + '/assets/favicon-' + c[0] + '.svg';
    window.__AIFWCW = { name: c[0], accent: c[1], iconUrl: icon };

    var fav = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (fav) fav.href = icon;

    // These only exist once the body is parsed, so the head-time call skips them.
    // cp-theme.js repoints the bar's mark from inside apply() and the copied bar
    // relies on that, so this does the same rather than making the bar patch it.
    var mark = document.getElementById('cwCookie');
    if (mark) mark.src = icon;
    var label = document.getElementById('cwName');
    if (label) label.textContent = c[0];
    var tray = document.getElementById('cwMenu');
    if (tray) {
      var sw = tray.querySelectorAll('[data-cw-set]');
      for (var k = 0; k < sw.length; k++) {
        sw[k].setAttribute('aria-checked', sw[k].getAttribute('data-cw-set') === c[0] ? 'true' : 'false');
      }
    }

    current = c[0];
    try { document.dispatchEvent(new CustomEvent('aifw-colourway', { detail: window.__AIFWCW })); } catch (e) {}
    return window.__AIFWCW;
  }

  window.AIFWTheme = {
    list: CW,
    apply: apply,
    set: function (name) {
      try { localStorage.setItem(STORE, name); } catch (e) {}
      return apply(name);
    },
    current: function () { return current; },
    isPicked: function () { return !!saved(); },
    clear: function () {
      try { localStorage.removeItem(STORE); } catch (e) {}
      return apply(pageDefault());
    }
  };

  apply(current);
})();
