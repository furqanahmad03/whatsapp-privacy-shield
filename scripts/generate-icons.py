#!/usr/bin/env python3
"""Generate Chrome extension PNG icons from the transparent eye artwork."""

from pathlib import Path

from PIL import Image


ICON_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SOURCE = ICON_DIR / "privacy-eye.png"


def main() -> None:
    with Image.open(SOURCE) as source:
        source = source.convert("RGBA")
        for size in (16, 32, 48, 128):
            icon = source.resize((size, size), Image.Resampling.LANCZOS)
            path = ICON_DIR / f"icon{size}.png"
            icon.save(path, format="PNG", optimize=True)
            print(f"wrote {path}")


if __name__ == "__main__":
    main()
