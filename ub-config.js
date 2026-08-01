/*!
 * aifreeware's configuration for the shared utility bar in /ub/.
 *
 * /ub/ is a verbatim copy of ~/Projects/utility-bar. Nothing in it is edited here.
 * This file is the whole of the per-site work: the palette, the icon path, the
 * storage key, the sign-in link, and the account chip. It replaces the old
 * hand-copied /bar.js and /theme.js, which are gone.
 *
 * MUST be loaded synchronously in <head>, immediately before /ub/theme.js, and
 * after the <link rel="icon" type="image/svg+xml"> that theme.js repoints.
 * Deferring either one means the default colourway paints first and the saved
 * pick snaps in after, which is the tell of a cheap picker.
 *
 * Loaded on all four pages. /run/ takes the theme engine only, so on that page
 * everything except `colour` is inert: the terminal stays immersive and offers
 * no chrome to change the colour, but it still honours a saved one.
 */
window.UtilBar = {
  home: '/',

  colour: {
    /* The pages alias --lime to --accent, so setting --accent recolours everything. */
    accentVar: '--accent',
    /* aifreeware's own 13 marks, built by build-icons.py. Not the module's icons/. */
    icon: '/assets/favicon-{name}.svg',
    /* Unchanged from the old theme.js so an existing visitor's pick survives. */
    store: 'aifw-cw',
    /* The tuner preview line. The module accents the last entry only. */
    specimen: ['Everything', 'runs', 'on', 'your', 'own', 'machine.'],
    /* Ink for text sitting ON a light accent. The engine's default is CrumbProof's
       #160f16; this is aifreeware's own ground. Near-invisible either way on a dark
       page, but it should be this site's colour, not the one it inherited. */
    inkDark: '#171717',

    /* [name, accent, rampLight, rampDark].
       Column 2 is aifreeware's own table, unchanged. Columns 3 and 4 are the
       ombre stops, taken from crumbproof/public/cp-theme.js, which now carries
       acid-rain too. acid-rain leads because it is the brand and the default. */
    palette: [
      ['acid-rain', '#e2f79c', '#E2F79C', '#5C7E2C'],
      ['berry',     '#FF8DC5', '#FF8DC5', '#8C235A'],
      ['punch',     '#F2379D', '#FFF6D6', '#BE2D2D'],
      ['neon',      '#E11CFF', '#7DFCE0', '#0F0FFF'],
      ['orchid',    '#E57DFC', '#EBFFF5', '#620DE9'],
      ['lagoon',    '#1CFFFF', '#FFFF80', '#FF2E5C'],
      ['reef',      '#37F2D2', '#FFF941', '#F973F9'],
      ['jade',      '#24FFCC', '#FFE250', '#D726FF'],
      ['acid',      '#1CFF7E', '#80FFC0', '#463464'],
      ['sprout',    '#80FFC0', '#80FFC0', '#D726FF'],
      ['cobalt',    '#027CF6', '#FF41E9', '#0F2BFF'],
      ['glacier',   '#7DFCE0', '#FDFFEB', '#02ADE6'],
      ['taffy',     '#FC7DB2', '#FFE26C', '#000FDB']
    ]
  },

  /* The account chip. The frame renders this placeholder; the site paints it
     below. Hidden with an inline style rather than the hidden attribute,
     because .ub-link sets display:inline-flex and would beat [hidden]. */
  extras: [
    { html: '<a id="aifwAcct" class="ub-link" href="/run/" style="display:none"></a>' }
  ],

  signin: { label: 'Sign in', href: '/login/' }
};

/* The module owns the bar and gives us the slot plus the utilbar:ready signal;
   the site owns the auth. This is the old bar.js paintAccount(), unchanged in
   behaviour: the account only means anything inside the terminal, so a signed-in
   visitor gets their email pointing at /run/ instead of the sign-in link. */
document.addEventListener('utilbar:ready', function () {
  var slot = document.getElementById('aifwAcct');
  if (!slot) return;
  fetch('/api/auth/get-session', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.user) return;
      slot.textContent = d.user.email;
      slot.style.display = '';
      var signin = document.querySelector('.ub-bar .ub-signin');
      if (signin) signin.style.display = 'none';
    })
    .catch(function () {});
});
