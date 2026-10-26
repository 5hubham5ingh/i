#!/usr/bin/env bash
#
# Turn the source illustrations into transparent, page-toned line art.
#
# The source PNGs carry a baked-in cream/tan paper background. A flat colour
# key is not enough: the paper has a vignette, stains, and several different
# base tints. This script builds an ink mask from two signals instead:
#
#   1. a local paper estimate (large blur) so vignetting and stains cancel;
#   2. absolute darkness, so solid ink (which the local estimate would also
#      treat as "paper") stays opaque.
#
# The mask is then cleaned of isolated specks, applied as alpha to flat book
# ink, cropped to the drawing, and exported as lossless WebP.
#
# Light-on-dark sources are trimmed and inverted first. Continuous-tone sources
# use a feathered tonal wash instead of the cut-out mask. See the `invert` and
# `wash` maps below.
#
# Usage: tools/process-illustrations.sh
# Requires ImageMagick 7 (`magick`).

set -euo pipefail

cd "$(dirname "$0")/.."

in_dir="public/illustrations"
out_dir="public/illustrations/processed"
mkdir -p "$out_dir"

# Source file -> URL-safe output name.
declare -A names=(
  ["Wordsmith.png"]="wordsmith"
  ["TheModernMaze.png"]="the-modern-maze"
  ["Strom_within.png"]="strom-within"
  ["Am_I.png"]="am-i"
  ["The_autumn_leaf.png"]="the-autumn-leaf"
  ["Reverie.png"]="reverie"
  ["Frivolous_love.png"]="frivolous-love"
  ["Metamorphosis.png"]="metamorphosis"
  ["The_Moon-a_Man.png"]="the-moon-a-man"
  ["An_early_morning_jest.png"]="an-early-morning-jest"
  ["BurdenOfBeast.jpg"]="burden-of-beast"
  ["Bee.png"]="bee"
  ["Miss_cigrate.png"]="miss-cigarette"
  ["Frenemy.jpg"]="frenemy"
  ["Ascendance.png"]="ascendance"
  ["Physiology.png"]="physiology"
)

# Most sources are dark drawings on paper. These fit the normal ink-mask
# pipeline. A few are not:
#
#   invert — light strokes on a dark ground. Trim the paper border, invert, then
#            run the normal pipeline so the strokes become book ink and the
#            dark ground becomes transparent.
#   wash   — a soft, full-tone painting rather than line art. Keep its tonal
#            range as a feathered, sepia wash instead of forcing it through the
#            cut-out mask, which would turn it into abstract blobs.
declare -A invert=(
  ["Miss_cigrate.png"]=1
)

declare -A wash=(
)

# Remove non-art marks before masking. Frenemy.jpg carries a small generator
# watermark in the lower-right paper; the rectangle covers paper only.
declare -A cleanup=(
  ["Frenemy.jpg"]="755 1140 847 1215"
)

# Clean, already-cut line art can have intentional short strokes that are
# smaller than the paper-speck threshold. Keep those components.
declare -A area=(
  ["BurdenOfBeast.jpg"]=100
)

work="$(mktemp -d)"
trap 'if [[ -z "${KEEP:-}" ]]; then rm -rf "$work"; else echo "work kept: $work"; fi' EXIT

for src_name in "${!names[@]}"; do
  if [[ -n "${ONLY:-}" && "$src_name" != "$ONLY" ]]; then
    continue
  fi

  src="$in_dir/$src_name"
  out="$out_dir/${names[$src_name]}.webp"

  if [[ ! -f "$src" ]]; then
    echo "skip (missing): $src" >&2
    continue
  fi

  # Soft paintings become a tonal wash that fades into the page. They still
  # carry their own dimensions, so pagination reserves the right space.
  if [[ -n "${wash[$src_name]:-}" ]]; then
    width="$(magick identify -format '%w' "$src")"
    height="$(magick identify -format '%h' "$src")"

    magick "$src" -colorspace Gray -auto-level -level 5%,92% \
      +level-colors '#2c1810','#ffffff' \
      "$work/wash-tone.png"

    magick -size "${width}x${height}" xc:black -fill white \
      -draw "ellipse $((width / 2)),$((height / 2)) \
        $((width * 46 / 100)),$((height * 48 / 100)) 0,360" \
      -blur 0x55 \
      "$work/wash-mask.png"

    magick "$work/wash-tone.png" "$work/wash-mask.png" -alpha off \
      -compose CopyOpacity -composite \
      -resize '1400x1400>' -strip \
      -define webp:lossless=true -define webp:method=6 \
      "$out"

    printf '%s -> %s (%s)\n' "$src_name" "$out" \
      "$(magick identify -format '%wx%h' "$out")"
    continue
  fi

  # Remove non-art marks (for example, a generator watermark) before masking.
  art_src="$src"
  if [[ -n "${cleanup[$src_name]:-}" ]]; then
    read -r x1 y1 x2 y2 <<< "${cleanup[$src_name]}"
    magick "$src" -fill '#f8eed9' \
      -draw "rectangle $x1,$y1 $x2,$y2" \
      "$work/cleaned-source.png"
    art_src="$work/cleaned-source.png"
  fi

  # Light-on-dark art is inverted first. Trim removes the cream border; the
  # 3px shave drops the dark edge line left by the source's black field.
  if [[ -n "${invert[$src_name]:-}" ]]; then
    magick "$src" -fuzz 8% -trim +repage -shave 3x3 +repage \
      -colorspace Gray -negate \
      "$work/inverted.png"
    art_src="$work/inverted.png"
  fi

  mask="$work/mask.png"
  clean="$work/clean.png"
  components="$work/components.png"

  # Ink density: local paper removal + absolute darkness. Keep the source out
  # of this image stack: `-composite` would otherwise use it as an operand.
  magick \
    \( "$art_src" -colorspace Gray -blur 0x30 \) \
    \( "$art_src" -colorspace Gray \) \
    -compose MinusSrc -composite -clamp \
    -level 2.75%,9.02% \
    \( "$art_src" -colorspace Gray -level 17.65%,78.43% -negate \) \
    -compose Lighten -composite \
    -level 9%,100% \
    -statistic Median 3x3 \
    -blur 0x0.4 \
    "$mask"

  # Drop isolated paper specks, but keep the drawing's connected components.
  # Most sources use 2500; clean line art opts into a lower threshold so short
  # facial strokes are not mistaken for specks.
  magick "$mask" -threshold 8% \
    -define connected-components:area-threshold="${area[$src_name]:-2500}" \
    -define connected-components:mean-color=true \
    -connected-components 8 \
    "$components"

  magick "$mask" "$components" -compose Multiply -composite "$clean"

  # Crop to the cleaned drawing, add a small transparent margin, and tone it
  # with the book ink. WebP lossless keeps the hatching crisp.
  bbox="$(magick "$components" -format '%@' info:)"
  crop_args=()
  if [[ -n "$bbox" ]]; then
    crop_args=(-crop "$bbox" +repage)
  fi

  magick "$art_src" -alpha off \
    -fill '#2c1810' -colorize 100 \
    "$clean" -alpha off -compose CopyOpacity -composite \
    "${crop_args[@]}" \
    "$work/art.png"

  # `-border` on the in-memory palette-alpha image is lossy in IM 7, so write
  # the cut-out first and add the transparent margin in a second pass.
  magick "$work/art.png" \
    -bordercolor none -border 16 \
    -resize '1400x1400>' \
    -strip \
    -define webp:lossless=true -define webp:method=6 \
    "$out"

  printf '%s -> %s (%s)\n' "$src_name" "$out" \
    "$(magick identify -format '%wx%h' "$out")"
done
