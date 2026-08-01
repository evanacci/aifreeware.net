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
