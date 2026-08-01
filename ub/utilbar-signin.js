/*!
 * utilbar-signin.js — Sign in, inside the bar. Renders a dropdown panel (so a click never
 * leaves the page and never loses the bar/tuner). Needs utilbar.js. Config:
 *   signin: {
 *     label: 'Sign in',
 *     onSubmit: function (creds, ui) { … },   // creds = {email, password};
 *                                             //   ui.message('…'), ui.close() provided
 *     action: '/api/auth/sign-in',            // …or let the default form POST here, or
 *     panel: '<form>…</form>',                // …supply your own panel markup (wire it on
 *                                             //   utilbar:ready), or
 *     href: '/admin',                         // …nothing above -> a plain navigating link.
 *     forgotHref: '/forgot'                   // optional link under the default form
 *   }
 * Auth is yours: the piece collects the fields and hands them to your onSubmit/action —
 * it never sends credentials anywhere itself.
 */
(function () {
  var UB = window.UtilBar; if (!UB) return;
  var cfg = UB.signin; if (!cfg) return;
  UB._signinClaimed = true;                          // frame: don't also add your own link
  var esc = UB.esc;
  var wantsPanel = cfg.panel || cfg.onSubmit || cfg.action;

  function dropStaleLink() { var s = document.querySelector('a.ub-signin'); if (s) s.remove(); }  // frame's fallback, if it beat us

  if (!wantsPanel) {                                 // plain navigating link
    UB.ready(function () { dropStaleLink(); UB.mount('right', '<a class="ub-link ub-signin" href="' + esc(cfg.href || '#') + '">' + esc(cfg.label || 'Sign in') + '</a>', 'signin'); });
    return;
  }

  UB.css([
    '.ub-si-panel{position:absolute;top:calc(100% + 9px);right:0;width:252px;background:var(--ub-surface,#1A1824);border:1px solid var(--ub-line,#2C2939);border-radius:13px;padding:15px;box-shadow:0 18px 44px -14px rgba(0,0,0,.75);z-index:30}',
    '.ub-si-form{display:flex;flex-direction:column;gap:11px}',
    '.ub-si-field{display:flex;flex-direction:column;gap:5px}',
    '.ub-si-field span{font-family:var(--ub-mono,Menlo,monospace);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ub-muted,#6C6880)}',
    '.ub-si-field input{background:var(--ub-ink-2,#14121B);border:1px solid var(--ub-line,#2C2939);border-radius:8px;color:var(--ub-text,#ECEAF2);font-family:var(--ub-sans,sans-serif);font-size:13.5px;padding:9px 11px;outline:0;transition:border-color .2s}',
    '.ub-si-field input:focus{border-color:var(--ub-accent,#FF8DC5)}',
    '.ub-si-btn{margin-top:2px;background:var(--ub-accent,#FF8DC5);color:var(--ub-on-accent,#160f16);border:0;border-radius:8px;font-family:var(--ub-sans,sans-serif);font-weight:700;font-size:13.5px;padding:10px;cursor:pointer;transition:filter .2s}',
    '.ub-si-btn:hover{filter:brightness(1.08)}',
    '.ub-si-forgot{font-family:var(--ub-sans,sans-serif);font-size:12px;color:var(--ub-muted,#6C6880);text-decoration:none;text-align:center}',
    '.ub-si-forgot:hover{color:var(--ub-accent,#FF8DC5)}',
    '.ub-si-msg{margin:0;font-family:var(--ub-sans,sans-serif);font-size:12px;line-height:1.4;color:#FF6B6B}',
    '.ub-si-msg:empty{display:none}'
  ].join(''));

  var custom = !!cfg.panel;
  var body = cfg.panel || (
    '<form class="ub-si-form"' + (cfg.action && !cfg.onSubmit ? ' method="post" action="' + esc(cfg.action) + '"' : '') + '>' +
      '<label class="ub-si-field"><span>Email</span><input type="email" name="email" autocomplete="email" required /></label>' +
      '<label class="ub-si-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required /></label>' +
      '<button type="submit" class="ub-si-btn">' + esc(cfg.label || 'Sign in') + '</button>' +
      (cfg.forgotHref ? '<a class="ub-si-forgot" href="' + esc(cfg.forgotHref) + '">Forgot password?</a>' : '') +
      '<p class="ub-si-msg" role="alert"></p>' +
    '</form>'
  );

  var html =
    '<details class="ub-sel ub-sisel"><summary class="ub-link ub-signin" aria-label="Sign in">' + esc(cfg.label || 'Sign in') +
      '&nbsp;<span class="ub-chev" aria-hidden="true">&#9662;</span></summary>' +
    '<div class="ub-si-panel" role="dialog" aria-label="Sign in">' + body + '</div></details>';

  UB.ready(function () {
    dropStaleLink();
    UB.mount('right', html, 'signin');
    if (custom) return;                              // site wires its own panel via utilbar:ready
    var form = document.querySelector('.ub-si-panel form'); if (!form) return;
    var msg = form.querySelector('.ub-si-msg');
    var ui = {
      message: function (t) { if (msg) msg.textContent = t || ''; },
      close: function () { var d = form.closest('details'); if (d) d.removeAttribute('open'); }
    };
    if (typeof cfg.onSubmit === 'function') {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        cfg.onSubmit({ email: (form.email || {}).value || '', password: (form.password || {}).value || '' }, ui);
      });
    }
    // else: cfg.action is on the form -> the browser POSTs it natively.
  });
})();
