#!/bin/sh
# Converts the exported JPGs into web-sized WebP files.
#   <name>-s.webp  720px wide  (grids, cards, thumbnails)
#   <name>-l.webp  max 2000px  (hero + lightbox)
# Requires cwebp (brew install webp). Run from anywhere:  sh site/tools/convert-images.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../../compassandtrail-portfolio"
OUT="$HERE/../img"

cd "$SRC"
for f in */*.jpg; do
  b="${f%.jpg}"
  mkdir -p "$OUT/$(dirname "$f")"
  [ -f "$OUT/$b-s.webp" ] && [ -f "$OUT/$b-l.webp" ] && continue
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  if [ "$w" -gt 2000 ]; then cwebp -quiet -q 80 -resize 2000 0 "$f" -o "$OUT/$b-l.webp"
  else cwebp -quiet -q 80 "$f" -o "$OUT/$b-l.webp"; fi
  cwebp -quiet -q 72 -resize 720 0 "$f" -o "$OUT/$b-s.webp"
  echo "converted $f"
done
mkdir -p "$OUT/icons" && cp home/*.png "$OUT/icons/"
