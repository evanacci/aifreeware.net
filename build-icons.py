#!/usr/bin/env python3
"""Generate the favicon set and the social card from the site's own ANSI Shadow art.

The art is drawn as rectangles rather than set in a font. The site lists
'JetBrains Mono' first but never loads it as a webfont, so visitors already see
whatever mono they happen to have. Drawing the cells directly is the only way an
icon can match the wordmark on every machine.

Two levels of detail, picked per size:
  full      solid blocks bright, bevel glyphs dim. Reads as depth at 32px and up.
  simple    solid blocks only, counters knocked back to the background. The bevel
            is sub-pixel below about 24px, so at 16px it only muddies the letter.

Usage: python3 build-icons.py
"""

from pathlib import Path
import subprocess

OUT = Path(__file__).parent
BG = "#171717"
LIME = "#e2f79c"
SHADOW_OPACITY = 0.30

# Lifted verbatim from index.html so the icon can never drift from the wordmark.
AI = """\
 █████╗ ██╗
██╔══██╗██║
███████║██║
██╔══██║██║
██║  ██║██║
╚═╝  ╚═╝╚═╝"""

FREEWARE = """\
███████╗██████╗ ███████╗███████╗██╗    ██╗ █████╗ ██████╗ ███████╗
██╔════╝██╔══██╗██╔════╝██╔════╝██║    ██║██╔══██╗██╔══██╗██╔════╝
█████╗  ██████╔╝█████╗  █████╗  ██║ █╗ ██║███████║██████╔╝█████╗
██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║███╗██║██╔══██║██╔══██╗██╔══╝
██║     ██║  ██║███████╗███████╗╚███╔███╔╝██║  ██║██║  ██║███████╗
╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝"""

SOLID = "█"


def grid(art):
    """Rows padded to equal width, so trailing spaces cannot shift a column."""
    rows = art.split("\n")
    w = max(len(r) for r in rows)
    return [r.ljust(w) for r in rows], w, len(rows)


def cells(art, detail="full"):
    """Yield (col, row, kind) for every inked cell.

    kind is 'solid' for a full block and 'shadow' for a bevel glyph. In ANSI
    Shadow every non-space, non-block glyph is part of the drop shadow that sits
    one cell down and to the right of a solid mass, including the parts that
    wrap into a letter's counter.
    """
    rows, _, _ = grid(art)
    for r, line in enumerate(rows):
        for c, ch in enumerate(line):
            if ch == SOLID:
                yield c, r, "solid"
            elif ch != " " and detail == "full":
                yield c, r, "shadow"


def svg(art, cell_w=6, cell_h=10, pad=6, detail="full", bg=BG, square=False):
    """Draw the art, trimmed to its ink so padding means the same thing either way.

    square centres the ink in a square canvas, which is what an icon needs; an
    oblong viewBox forced into a square favicon slot comes out stretched.
    """
    inked = list(cells(art, detail))
    min_c = min(c for c, _, _ in inked)
    max_c = max(c for c, _, _ in inked)
    min_r = min(r for _, r, _ in inked)
    max_r = max(r for _, r, _ in inked)
    ink_w = (max_c - min_c + 1) * cell_w
    ink_h = (max_r - min_r + 1) * cell_h

    if square:
        w = h = max(ink_w, ink_h) + pad * 2
        off_x = (w - ink_w) // 2 - min_c * cell_w
        off_y = (h - ink_h) // 2 - min_r * cell_h
    else:
        w, h = ink_w + pad * 2, ink_h + pad * 2
        off_x = pad - min_c * cell_w
        off_y = pad - min_r * cell_h

    solid, shadow = [], []
    for c, r, kind in inked:
        rect = f'<rect x="{off_x + c * cell_w}" y="{off_y + r * cell_h}" width="{cell_w}" height="{cell_h}"/>'
        (solid if kind == "solid" else shadow).append(rect)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" shape-rendering="crispEdges">'
    ]
    if bg:
        parts.append(f'<rect width="{w}" height="{h}" fill="{bg}"/>')
    if shadow:
        parts.append(f'<g fill="{LIME}" fill-opacity="{SHADOW_OPACITY}">' + "".join(shadow) + "</g>")
    parts.append(f'<g fill="{LIME}">' + "".join(solid) + "</g>")
    parts.append("</svg>")
    return "\n".join(parts), w, h


def png(svg_text, path, width, height):
    subprocess.run(
        ["rsvg-convert", "-w", str(width), "-h", str(height), "-o", str(path)],
        input=svg_text.encode(), check=True,
    )
    print(f"  {path.name}  {width}x{height}")


def main():
    (OUT / "assets").mkdir(exist_ok=True)
    a = OUT / "assets"

    print("favicon")
    full, _, _ = svg(AI, cell_w=6, cell_h=10, pad=7, square=True)
    simple, _, _ = svg(AI, cell_w=6, cell_h=10, pad=7, detail="simple", square=True)

    # The SVG is the one a modern browser reaches for, and it has to hold up in
    # a 16px tab as well as a bookmark bar. Below about 24px the bevel stops
    # being depth and starts filling the A's counter, so the vector carries the
    # simplified mark and the bevel is kept for sizes that can show it.
    (a / "favicon.svg").write_text(simple)
    print("  favicon.svg   simplified, crisp at any size")

    png(simple, a / "favicon-16.png", 16, 16)
    png(full, a / "favicon-32.png", 32, 32)
    png(full, a / "apple-touch-icon.png", 180, 180)

    subprocess.run(
        ["magick", str(a / "favicon-16.png"), str(a / "favicon-32.png"),
         str(OUT / "favicon.ico")], check=True,
    )
    print("  favicon.ico  16+32")

    print("social card")
    make_og(a / "og.png")


def mono(size):
    for candidate in ("/System/Library/Fonts/Menlo.ttc",
                      "/System/Library/Fonts/SFNSMono.ttf",
                      "/System/Library/Fonts/Supplemental/Andale Mono.ttf"):
        if Path(candidate).exists():
            from PIL import ImageFont
            return ImageFont.truetype(candidate, size)
    return None


def make_og(path):
    """1200x630 card: the site's own header rule over the hero lockup."""
    import io
    from PIL import Image, ImageDraw

    W, H = 1200, 630
    CHROME_H = 62
    GAP = 54

    # FREEWARE is 66 cols and sets the width. AI is centred over it, the same
    # way .lockup centres the two pre blocks in the hero.
    cell_w, cell_h = 14, 23
    ai_svg, ai_w, ai_h = svg(AI, cell_w=cell_w, cell_h=cell_h, pad=0, bg=None)
    fw_svg, fw_w, fw_h = svg(FREEWARE, cell_w=cell_w, cell_h=cell_h, pad=0, bg=None)

    card = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(card)

    tagline = "Free software, built and given away."
    f_tag = mono(27)
    tag_h = d.textbbox((0, 0), tagline, font=f_tag)[3] if f_tag else 0

    block_h = ai_h + fw_h + GAP + tag_h
    top = CHROME_H + (H - CHROME_H - block_h) // 2

    for s, sw, sh, dy in ((ai_svg, ai_w, ai_h, 0), (fw_svg, fw_w, fw_h, ai_h)):
        p = subprocess.run(["rsvg-convert", "-w", str(sw), "-h", str(sh)],
                           input=s.encode(), check=True, capture_output=True)
        layer = Image.open(io.BytesIO(p.stdout)).convert("RGBA")
        card.paste(layer, ((W - sw) // 2, top + dy), layer)

    if f_tag:
        tw = d.textbbox((0, 0), tagline, font=f_tag)[2]
        d.text(((W - tw) // 2, top + ai_h + fw_h + GAP), tagline, font=f_tag, fill="#8a8a8a")

    draw_chrome(d, W, CHROME_H)
    card.save(path)
    print(f"  {path.name}  {W}x{H}")


def draw_chrome(d, W, chrome_h):
    """The header strip from the site: host on the left, framing on the right."""
    f = mono(21)
    if not f:
        return
    pad, base = 54, chrome_h // 2 - 13
    d.text((pad, base), "aifreeware.net", font=f, fill=LIME)

    # The blinking block cursor that follows the host name in the site chrome.
    hw = d.textbbox((0, 0), "aifreeware.net", font=f)[2]
    d.rectangle([pad + hw + 7, base + 2, pad + hw + 18, base + 24], fill=LIME)

    right = "free / open source"
    rw = d.textbbox((0, 0), right, font=f)[2]
    d.text((W - pad - rw, base), right, font=f, fill="#5a5a5a")
    d.rectangle([0, chrome_h, W, chrome_h], fill="#35401f")


if __name__ == "__main__":
    main()
