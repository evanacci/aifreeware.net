// Rotating social card. /api/og returns one of the pre-rendered colourway cards
// per request, so shares vary in colour the way the site does.
//
// Worth knowing before wondering why a link never changes: social crawlers fetch
// an OG image once per scrape and cache it, and they do not run JS. So a link
// that has already been shared keeps whatever colour it was scraped with. The
// rotation shows up across different shares and platforms, not live per viewer.
// no-store nudges a re-fetch where a crawler honours it.
//
// The cards themselves come from build-icons.py. Same art in every one, accent
// is the only difference.

const COLOURWAYS = [
  'acid-rain', 'berry', 'punch', 'neon', 'orchid', 'lagoon', 'reef',
  'jade', 'acid', 'sprout', 'cobalt', 'glacier', 'taffy',
];

export default async (req) => {
  const origin = new URL(req.url).origin;
  const name = COLOURWAYS[Math.floor(Math.random() * COLOURWAYS.length)];

  try {
    const res = await fetch(`${origin}/assets/og-${name}.png`);
    if (!res.ok) throw new Error(`render missing (${res.status})`);
    return new Response(await res.arrayBuffer(), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'no-store, max-age=0',
        'x-aifw-colourway': name,
      },
    });
  } catch {
    // Never leave a preview blank. Fall back to the default card.
    return Response.redirect(`${origin}/assets/og.png`, 302);
  }
};

export const config = { path: '/api/og' };
