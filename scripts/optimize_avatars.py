#!/usr/bin/env python3
"""Optimize avatar images: resize and convert to WebP into assets/images/optimized."""
from pathlib import Path
import sys

try:
    from PIL import Image
except Exception as e:
    print("Pillow is required. Install with: python3 -m pip install --user pillow")
    raise

SRC = Path("assets/images")
OUT = SRC / "optimized"
OUT.mkdir(parents=True, exist_ok=True)

SIZES = [128, 256, 512]
QUALITY = 80

def human(n):
    for unit in ['B','KB','MB','GB']:
        if n < 1024.0:
            return f"{n:3.1f}{unit}"
        n /= 1024.0
    return f"{n:.1f}TB"

processed = []

for p in sorted(SRC.iterdir()):
    if not p.is_file():
        continue
    if 'avatar' not in p.name.lower():
        continue
    if p.suffix.lower() not in ('.jpg', '.jpeg', '.png', '.webp'):
        continue

    try:
        img = Image.open(p)
    except Exception as e:
        print(f"Skipping {p.name}: cannot open ({e})")
        continue

    orig_size = p.stat().st_size
    processed_files = []

    # Save a full-size WebP version (no upscale)
    try:
        img_rgb = img.convert('RGB')
        out_full = OUT / f"{p.stem}.webp"
        img_rgb.save(out_full, 'WEBP', quality=QUALITY, method=6)
        processed_files.append(out_full)
    except Exception as e:
        print(f"Failed to save full WebP for {p.name}: {e}")

    # Create resized variants
    for s in SIZES:
        # Only downscale: skip if both dimensions smaller than target
        if img.width < s and img.height < s:
            continue
        im2 = img.copy()
        im2.thumbnail((s, s), Image.LANCZOS)
        try:
            out_path = OUT / f"{p.stem}_{s}.webp"
            im2.convert('RGB').save(out_path, 'WEBP', quality=QUALITY, method=6)
            processed_files.append(out_path)
        except Exception as e:
            print(f"Failed to save {out_path.name}: {e}")

    # Report
    new_total = sum(f.stat().st_size for f in processed_files if f.exists())
    print(f"{p.name}: {human(orig_size)} -> {len(processed_files)} files, total {human(new_total)}")
    processed.append((p.name, orig_size, processed_files))

print(f"Done. Optimized files are in: {OUT}")
if not processed:
    print("No avatar files found in assets/images (files must include 'avatar' in their name).")

if __name__ == '__main__':
    pass
