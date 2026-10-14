#!/usr/bin/env python3
"""Generate the PWA icons (run once; commits the PNGs into icons/)."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
SS = 4  # supersample factor for smooth edges


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size, inset_frac=0.0, radius_frac=0.22):
    """Rounded gradient tile with a pencil-puzzle grid motif.

    inset_frac shrinks the motif so maskable icons keep a safe zone.
    """
    s = size * SS
    img = Image.new("RGB", (s, s), "#0f1115")
    d = ImageDraw.Draw(img)

    # vertical gradient background (indigo -> violet-blue)
    top, bot = (99, 132, 255), (139, 92, 246)
    for y in range(s):
        d.line([(0, y), (s, y)], fill=lerp(top, bot, y / (s - 1)))

    # rounded-corners mask
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_frac), fill=255)
    bg = Image.new("RGB", (s, s), "#0f1115")
    bg.paste(img, (0, 0), mask)
    img = bg
    d = ImageDraw.Draw(img)

    # grid motif inside the safe area
    N = 4
    inset = s * (0.16 + inset_frac)
    box = s - 2 * inset
    gap = box * 0.06
    cell = (box - gap * (N - 1)) / N
    filled = {(0, 1), (1, 1), (1, 2), (2, 2), (2, 0), (3, 0), (3, 1), (0, 3), (1, 3)}
    for r in range(N):
        for c in range(N):
            x0 = inset + c * (cell + gap)
            y0 = inset + r * (cell + gap)
            x1, y1 = x0 + cell, y0 + cell
            if (r, c) in filled:
                d.rounded_rectangle([x0, y0, x1, y1], radius=cell * 0.18, fill=(255, 255, 255))
            else:
                d.rounded_rectangle([x0, y0, x1, y1], radius=cell * 0.18,
                                    outline=(255, 255, 255), width=max(2, int(cell * 0.10)))

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    targets = {
        "icon-192.png": (192, 0.0),
        "icon-512.png": (512, 0.0),
        "icon-maskable-512.png": (512, 0.12),  # shrink motif for maskable safe zone
        "apple-touch-icon.png": (180, 0.0),
    }
    for name, (size, inset) in targets.items():
        draw_icon(size, inset).save(os.path.join(OUT, name))
        print("wrote icons/" + name)


if __name__ == "__main__":
    main()
