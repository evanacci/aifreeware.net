/*!
 * utilbar-status.js — an online/offline dot that shows whether your product is up.
 * Snaps into the frame's RIGHT. Needs utilbar.js first, and UtilBar.status set:
 *   status: {
 *     url: '/api/health',        // pinged on a heartbeat; ok response = up
 *     every: 30000,              // ms between pings (default 30s)
 *     method: 'GET',
 *     label: 'CrumbProof',       // text before the dot
 *     upLabel: 'Online', downLabel: 'Offline'
 *   }
 * With no url it falls back to the browser's own online/offline state.
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var cfg = UB.status; if (!cfg) return;
  var esc = UB.esc;

  UB.css([
    '.ub-status{display:inline-flex;align-items:center;gap:7px;font-family:var(--ub-mono,Menlo,monospace);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880)}',
    '.ub-status .ub-dot{width:7px;height:7px;border-radius:50%;background:var(--ub-muted,#6C6880);box-shadow:0 0 0 0 transparent;transition:background .3s,box-shadow .3s}',
    '.ub-status.up .ub-dot{background:#1CFF7E;box-shadow:0 0 8px -1px #1CFF7E}',
    '.ub-status.down .ub-dot{background:#FF4D4D;box-shadow:0 0 8px -1px #FF4D4D}'
  ].join(''));

  UB.ready(function () {
    var el = document.createElement('span');
    el.className = 'ub-status';
    el.innerHTML = '<span class="ub-dot" aria-hidden="true"></span><span class="ub-lbl">' + esc(cfg.label || 'Status') + '</span>';
    UB.mount('right', el, 'status');
    var lbl = el.querySelector('.ub-lbl');
    var up = cfg.upLabel || 'Online', down = cfg.downLabel || 'Offline';
    function paint(ok) { el.classList.toggle('up', ok); el.classList.toggle('down', !ok); lbl.textContent = ok ? up : down; }

    if (!cfg.url) {                                   // no endpoint -> reflect the browser's connection
      paint(navigator.onLine);
      window.addEventListener('online', function () { paint(true); });
      window.addEventListener('offline', function () { paint(false); });
      return;
    }
    UB.onBeat(function () {
      fetch(cfg.url, { method: cfg.method || 'GET', cache: 'no-store' })
        .then(function (r) { paint(r.ok); })
        .catch(function () { paint(false); });
    }, cfg.every || 30000);
  });
})();
