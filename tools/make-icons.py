"""Génère les icônes PNG de Lunoo (lune jaune sur fond bleu nuit).

Usage : python3 tools/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

NAVY = (31, 34, 80)
MOON = (245, 196, 81)
OUT = Path(__file__).resolve().parent.parent / "icons"
OUT.mkdir(exist_ok=True)


def icon(size: int, padding: float) -> Image.Image:
    scale = 4  # suréchantillonnage pour des bords lisses
    s = size * scale
    img = Image.new("RGB", (s, s), NAVY)
    d = ImageDraw.Draw(img)
    r = s * (0.5 - padding) * 0.78
    cx = cy = s / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=MOON)
    # découpe pour faire un croissant
    ox, oy, rr = cx + r * 0.45, cy - r * 0.35, r * 0.86
    d.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], fill=NAVY)
    return img.resize((size, size), Image.LANCZOS)


icon(192, 0.08).save(OUT / "icon-192.png")
icon(512, 0.08).save(OUT / "icon-512.png")
icon(512, 0.2).save(OUT / "icon-maskable-512.png")
icon(180, 0.08).save(OUT / "apple-touch-icon.png")
print("Icônes écrites dans", OUT)
