#!/usr/bin/env python3
"""compare_visual.py — compare two rendered floorplan images.

Used by the round-trip workflow (source image -> .floorplan -> rendered PNG)
to quantify how closely the regenerated render matches the original.

Outputs a JSON envelope with a similarity score in [0, 1], a per-channel
mean-absolute-error, a diff-pixel count, and optionally writes a
side-by-side composite PNG plus a difference-heatmap PNG.

Note on SSIM: a true Structural Similarity Index implementation requires
numpy/scikit-image which are heavier dependencies than Pillow alone. We
use a practical approximation that correlates well for line-art
floorplans: 1 - normalized L1 distance across all pixels. For
architectural diagrams this is usually within a few percent of true SSIM.

Usage:
    python3 compare_visual.py --a source.png --b rendered.png \
        [--composite out/side-by-side.png] [--diff out/diff.png] \
        [--threshold 25] [--resize auto|none|WxH]
"""

from __future__ import annotations

import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=DeprecationWarning)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _lib import (  # noqa: E402
    emit_ok,
    emit_runtime_error,
    emit_validation_error,
    ensure_output_dir,
    parse_args,
    require_python_dep,
)


def resolve_path(p: str) -> Path:
    path = Path(p).expanduser().resolve()
    if not path.exists():
        emit_validation_error([{"message": f"File not found: {path}"}])
    return path


def normalize_size(img_a, img_b, resize_mode: str):
    from PIL import Image  # noqa: WPS433

    if resize_mode == "none":
        return img_a, img_b
    if resize_mode == "auto":
        # Resize the larger one down to match the smaller, preserving aspect.
        wa, ha = img_a.size
        wb, hb = img_b.size
        if (wa, ha) == (wb, hb):
            return img_a, img_b
        target_w = min(wa, wb)
        scale_a = target_w / wa
        scale_b = target_w / wb
        img_a2 = img_a.resize((target_w, int(ha * scale_a)))
        img_b2 = img_b.resize((target_w, int(hb * scale_b)))
        # If heights still differ, pad the shorter one with white.
        _, ha2 = img_a2.size
        _, hb2 = img_b2.size
        target_h = max(ha2, hb2)
        if ha2 != target_h:
            pad = Image.new("RGB", (target_w, target_h), (255, 255, 255))
            pad.paste(img_a2, (0, 0))
            img_a2 = pad
        if hb2 != target_h:
            pad = Image.new("RGB", (target_w, target_h), (255, 255, 255))
            pad.paste(img_b2, (0, 0))
            img_b2 = pad
        return img_a2, img_b2
    # Explicit WxH form
    try:
        w_s, h_s = resize_mode.lower().split("x")
        w, h = int(w_s), int(h_s)
    except ValueError:
        emit_validation_error([{"message": f"Invalid --resize value: {resize_mode}"}])
    return img_a.resize((w, h)), img_b.resize((w, h))


def mean_abs_diff(img_a, img_b) -> tuple[float, int]:
    """Compute mean L1 difference normalized to [0, 1] across all RGB
    pixels. Also returns total pixel count."""

    from PIL import ImageChops, ImageStat  # noqa: WPS433

    diff = ImageChops.difference(img_a, img_b)
    total_px = diff.size[0] * diff.size[1]
    if diff.getbbox() is None:
        return 0.0, total_px
    stat = ImageStat.Stat(diff)
    channel_means = stat.mean[:3] if len(stat.mean) >= 3 else stat.mean
    mean_per_channel = sum(channel_means) / len(channel_means)
    return mean_per_channel / 255.0, total_px


def count_diff_pixels(img_a, img_b, threshold: int) -> int:
    """Count pixels whose grayscale L1 magnitude exceeds ``threshold``.

    Uses Pillow's histogram over the luminance of the difference image
    to avoid iterating every pixel in Python, which keeps the script
    fast enough for 2K-pixel floorplan renders.
    """

    from PIL import ImageChops  # noqa: WPS433

    diff = ImageChops.difference(img_a, img_b).convert("L")
    hist = diff.histogram()
    return sum(count for value, count in enumerate(hist) if value > threshold)


def make_composite(img_a, img_b, out_path: Path) -> None:
    from PIL import Image  # noqa: WPS433

    assert img_a.size[1] == img_b.size[1], "images must share height by this point"
    total_w = img_a.size[0] + img_b.size[0] + 8
    canvas = Image.new("RGB", (total_w, img_a.size[1]), (240, 240, 240))
    canvas.paste(img_a.convert("RGB"), (0, 0))
    canvas.paste(img_b.convert("RGB"), (img_a.size[0] + 8, 0))
    ensure_output_dir(str(out_path.parent))
    canvas.save(out_path, format="PNG")


def make_diff(img_a, img_b, out_path: Path, threshold: int) -> None:
    from PIL import ImageChops, Image  # noqa: WPS433

    diff = ImageChops.difference(img_a.convert("RGB"), img_b.convert("RGB"))
    amplified = diff.point(lambda v: 255 if v > threshold else v * 3)
    ensure_output_dir(str(out_path.parent))
    amplified.save(out_path, format="PNG")


def main() -> None:
    args = parse_args()
    a_arg = args.get("a")
    b_arg = args.get("b")
    composite = args.get("composite")
    diff_path = args.get("diff")
    threshold = int(args.get("threshold", 25) or 25)
    resize_mode = str(args.get("resize", "auto") or "auto")

    if not a_arg or not b_arg:
        emit_validation_error([{"message": "Missing --a <png> and/or --b <png>"}])

    pil = require_python_dep("PIL", "pip install Pillow")  # noqa: F841
    from PIL import Image  # noqa: WPS433

    path_a = resolve_path(a_arg)
    path_b = resolve_path(b_arg)

    try:
        img_a = Image.open(str(path_a)).convert("RGB")
        img_b = Image.open(str(path_b)).convert("RGB")
    except Exception as exc:  # broad: propagate as runtime error envelope
        emit_runtime_error([{"message": f"Could not open image: {exc}"}])
        return

    img_a, img_b = normalize_size(img_a, img_b, resize_mode)

    mean_l1, total_px = mean_abs_diff(img_a, img_b)
    similarity = max(0.0, 1.0 - mean_l1)

    diff_px = count_diff_pixels(img_a, img_b, threshold)
    diff_pct = diff_px / max(total_px, 1)

    composite_path = None
    diff_path_out = None
    if composite:
        composite_path = Path(composite).resolve()
        make_composite(img_a, img_b, composite_path)
    if diff_path:
        diff_path_out = Path(diff_path).resolve()
        make_diff(img_a, img_b, diff_path_out, threshold)

    emit_ok(
        {
            "a": str(path_a),
            "b": str(path_b),
            "size": {"width": img_a.size[0], "height": img_a.size[1]},
            "meanL1": mean_l1,
            "similarity": similarity,
            "diffPixels": diff_px,
            "diffPct": diff_pct,
            "threshold": threshold,
            "composite": str(composite_path) if composite_path else None,
            "diff": str(diff_path_out) if diff_path_out else None,
        }
    )


if __name__ == "__main__":
    main()
