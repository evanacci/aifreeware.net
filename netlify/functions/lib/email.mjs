// The only place that sends mail. Resend's REST API is called directly, which
// keeps this a no-build-step site: adding their SDK would mean bundling one.
//
// Sending throws on failure. Callers decide whether that matters. A password
// reset should surface the failure; anything incidental should not break the
// thing the visitor was actually doing.

const FROM = 'aifreeware <accounts@aifreeware.net>';

export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json();
}

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* The site is lime on near-black in a mono face, and the mark is ANSI Shadow
   block letters. Neither travels: a dark background is unreadable in a lot of
   mail clients, and the block art needs a monospace font the reader may not
   have. So the card is light with a dark header band carrying the real favicon,
   and the mono face is only used where a fallback still looks deliberate.
   Tables and inline styles because that is what mail clients support. */
export function brandedHtml({ heading, intro, buttonLabel, url, note }) {
  const btn = buttonLabel && url
    ? `<a href="${esc(url)}" style="display:inline-block;background:#171717;color:#e2f79c;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700;font-size:14px;letter-spacing:.04em;padding:14px 26px">${esc(buttonLabel)}</a>`
    : '';

  // Buttons get stripped or blocked often enough that the raw link has to be here too.
  const plain = url
    ? `<p style="margin:24px 0 0;font-size:12px;color:#6a6a6a;line-height:1.6">Or paste this into your browser:<br><span style="color:#4a4a4a;word-break:break-all">${esc(url)}</span></p>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f2f2ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ef;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e2e2dc">
        <tr><td style="background:#171717;padding:20px 28px">
          <img src="https://aifreeware.net/assets/favicon-32.png" width="26" height="26" alt="" style="display:block;border:0;margin-bottom:10px">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:.06em;color:#e2f79c">aifreeware.net</span>
        </td></tr>
        <tr><td style="padding:30px 28px 8px">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1a1a1a;font-weight:600">${esc(heading)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4a4a4a">${esc(intro)}</p>
          ${btn}
          ${plain}
          ${note ? `<p style="margin:24px 0 0;font-size:13px;color:#6a6a6a;line-height:1.6">${esc(note)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 28px 24px;border-top:1px solid #eeeee8">
          <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:#8a8a8a;letter-spacing:.03em">Free software, built and given away. &nbsp;&middot;&nbsp; by the9ines</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

// Plain-text alternative. Without one, a text-only client shows nothing at all,
// and spam filters treat html-only mail as a small strike against it.
export function brandedText({ heading, intro, url, note }) {
  return [heading, '', intro, '', url || '', '', note || '', '', '--', 'aifreeware.net', 'Free software, built and given away.']
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');
}
