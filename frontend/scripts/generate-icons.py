"""Generate install icons matching public/icon.svg. Requires Python + Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parents[1] / "public" / "icons"
output.mkdir(parents=True, exist_ok=True)

# The opaque background and inset artwork keep the maskable icon safe within
# Android's central 80% circle. Apple applies its own rounded corners.
scale = 4
icon = Image.new("RGB", (512 * scale, 512 * scale), "#111111")
draw = ImageDraw.Draw(icon)
for points in [
    [(112, 232), (256, 108), (400, 232), (376, 260), (256, 156), (136, 260)],
    [(152, 250), (256, 160), (360, 250), (360, 390), (292, 390), (292, 294), (220, 294), (220, 390), (152, 390)],
]:
    draw.polygon([(x * scale, y * scale) for x, y in points], fill="#00ff66")

for name, size in [
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("icon-maskable-512.png", 512),
    ("apple-touch-icon.png", 180),
]:
    icon.resize((size, size), Image.Resampling.LANCZOS).save(output / name, optimize=True)
