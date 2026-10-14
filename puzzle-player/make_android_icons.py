#!/usr/bin/env python3
"""Generate Android launcher icons + splash screens from the app's design.

Overwrites the default Capacitor icons under android/app/src/main/res/.
Run after `cap add android` (or anytime to refresh the branding).
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "android/app/src/main/res")

SS = 4
TOP, BOT = (99, 132, 255), (139, 92, 246)   # app accent gradient
DARK = (15, 17, 21)
GRID = 4
FILLED = {(0, 1), (1, 1), (1, 2), (2, 2), (2, 0), (3, 0), (3, 1), (0, 3), (1, 3)}


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _gradient(s):
    img = Image.new("RGB", (s, s))
    d = ImageDraw.Draw(img)
    for y in range(s):
        d.line([(0, y), (s, y)], fill=lerp(TOP, BOT, y / (s - 1)))
    return img


def _motif(d, cx, cy, span, line_w):
    gap = span * 0.06
    cell = (span - gap * (GRID - 1)) / GRID
    x0 = cx - span / 2
    y0 = cy - span / 2
    for r in range(GRID):
        for c in range(GRID):
            a = x0 + c * (cell + gap)
            b = y0 + r * (cell + gap)
            if (r, c) in FILLED:
                d.rounded_rectangle([a, b, a + cell, b + cell], radius=cell * 0.18, fill=(255, 255, 255))
            else:
                d.rounded_rectangle([a, b, a + cell, b + cell], radius=cell * 0.18,
                                    outline=(255, 255, 255), width=line_w)


def icon(size, mask="rounded", radius_frac=0.22):
    s = size * SS
    img = _gradient(s)
    m = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(m)
    if mask == "circle":
        md.ellipse([0, 0, s - 1, s - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_frac), fill=255)
    out = Image.new("RGBA", (s, s), DARK + (0,))
    out.paste(img, (0, 0), m)
    d = ImageDraw.Draw(out)
    inset = s * 0.17
    _motif(d, s / 2, s / 2, s - 2 * inset, max(2, int(s * 0.012)))
    return out.resize((size, size), Image.LANCZOS)


def foreground(size):
    """Adaptive-icon foreground: motif in the central safe zone, transparent elsewhere."""
    s = size * SS
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    # safe zone ~ 66/108 of the canvas
    span = s * 0.60
    _motif(d, s / 2, s / 2, span, max(2, int(span * 0.02)))
    return out.resize((size, size), Image.LANCZOS)


def splash(w, h, icon_frac=0.24):
    s = SS
    img = Image.new("RGB", (w * s, h * s), DARK)
    ic = icon(int(min(w, h) * icon_frac), mask="rounded")
    ic = ic.resize((ic.width * s, ic.height * s), Image.LANCZOS)
    img.paste(ic, ((w * s - ic.width) // 2, (h * s - ic.height) // 2), ic)
    return img.resize((w, h), Image.LANCZOS)


def main():
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, scale in densities.items():
        launcher = round(48 * scale)
        fg = round(108 * scale)
        d = os.path.join(RES, "mipmap-" + name)
        if not os.path.isdir(d):
            continue
        icon(launcher, mask="rounded").save(os.path.join(d, "ic_launcher.png"))
        icon(launcher, mask="circle").save(os.path.join(d, "ic_launcher_round.png"))
        foreground(fg).save(os.path.join(d, "ic_launcher_foreground.png"))
        print("mipmap-" + name, launcher, fg)

    for f in [os.path.join(RES, "drawable", "splash.png")] + \
             [os.path.join(RES, d, "splash.png") for d in os.listdir(RES) if d.startswith("drawable-")]:
        if not os.path.isfile(f):
            continue
        try:
            w, h = Image.open(f).size
        except Exception:
            continue
        splash(w, h).save(f)
        print("splash", f.replace(RES + "/", ""), (w, h))


if __name__ == "__main__":
    main()
