#!/usr/bin/env python3
"""Generates the extension's PNG icons from simple vector shapes (no external assets)."""
import math
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

BG_TOP = (14, 26, 34)      # deep teal-black
BG_BOTTOM = (10, 18, 24)
ACCENT = (37, 211, 102)    # WhatsApp green
ACCENT_DIM = (23, 133, 63)
WHITE = (240, 247, 244)


def rounded_square_mask(size, radius_ratio=0.22):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size), color=0)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        grad.putpixel((0, y), (r, g, b))
    return grad.resize((size, size))


def draw_shield(draw, size):
    cx = size / 2
    top = size * 0.16
    bottom = size * 0.88
    half_w = size * 0.30

    points = [
        (cx, top),
        (cx + half_w, top + half_w * 0.55),
        (cx + half_w, size * 0.52),
        (cx, bottom),
        (cx - half_w, size * 0.52),
        (cx - half_w, top + half_w * 0.55),
    ]
    draw.polygon(points, fill=ACCENT)

    # inner "eye-slash" privacy glyph: a soft eye shape with a diagonal slash
    eye_w = size * 0.30
    eye_h = size * 0.16
    ex0, ey0 = cx - eye_w / 2, cx - eye_h / 2 + size * 0.03
    ex1, ey1 = cx + eye_w / 2, cx + eye_h / 2 + size * 0.03
    draw.ellipse([ex0, ey0, ex1, ey1], outline=BG_BOTTOM, width=max(1, int(size * 0.035)))
    pupil_r = size * 0.045
    draw.ellipse([cx - pupil_r, cx - pupil_r + size * 0.03, cx + pupil_r, cx + pupil_r + size * 0.03], fill=BG_BOTTOM)

    slash_w = max(2, int(size * 0.05))
    draw.line(
        [(cx - eye_w * 0.62, cx - eye_h * 0.55 + size * 0.03), (cx + eye_w * 0.62, cx + eye_h * 0.95 + size * 0.03)],
        fill=BG_BOTTOM,
        width=slash_w,
    )


def make_icon(size):
    base = vertical_gradient(size, BG_TOP, BG_BOTTOM).convert("RGBA")
    mask = rounded_square_mask(size)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(base, (0, 0), mask)

    draw = ImageDraw.Draw(canvas)
    draw_shield(draw, size)

    return canvas


def main():
    for size in (16, 32, 48, 128):
        icon = make_icon(size)
        path = os.path.join(OUT_DIR, f"icon{size}.png")
        icon.save(path)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
