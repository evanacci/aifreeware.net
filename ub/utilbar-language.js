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
