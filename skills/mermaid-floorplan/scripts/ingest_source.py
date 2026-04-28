#!/usr/bin/env python3
"""ingest_source.py — normalize a floorplan source file (PDF/PNG/JPG/WEBP)
into a canonical PNG collection the agent can feed to vision-extraction.

Delegates PDF rasterization to the sibling `pdf` skill's converter
(`../pdf/scripts/convert_pdf_to_images.py`) when possible; falls back to
`pdf2image` directly if the sibling script is unavailable.

Outputs a JSON envelope on stdout with:

    {
      "success": true,
      "data": {
        "source": "/abs/path.pdf",
        "format": "pdf"|"image",
        "pages": [
          { "path": "/out/page_1.png", "width": W, "height": H, "dpi": 200 },
          ...
        ],
        "outDir": "/abs/out",
        "notes": [ ...human-readable notes... ]
      }
    }

Usage:
    python3 ingest_source.py --source plan.pdf --out-dir /tmp/ingest [--dpi 200]
    python3 ingest_source.py --source plan.png --out-dir /tmp/ingest
    python3 ingest_source.py --source plan.pdf --out-dir /tmp/ingest --max-dim 1400
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _lib import (  # noqa: E402
    EXIT_VALIDATION,
    EXIT_RUNTIME,
    emit_and_exit,
    emit_ok,
    emit_runtime_error,
    emit_validation_error,
    ensure_output_dir,
    parse_args,
    require_python_dep,
)

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp"}


def resolve_source(source: str) -> Path:
    p = Path(source).expanduser().resolve()
    if not p.exists():
        emit_validation_error([{"message": f"Source file not found: {p}"}])
    return p


def normalize_image_page(pil_image, out_path: Path, max_dim: int) -> dict:
    img = pil_image
    if img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGB")
    w, h = img.size
    if max_dim and (w > max_dim or h > max_dim):
        scale = min(max_dim / w, max_dim / h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h))
    img.save(out_path, format="PNG")
    return {"path": str(out_path), "width": img.size[0], "height": img.size[1]}


def ingest_pdf(source: Path, out_dir: Path, dpi: int, max_dim: int, notes: list) -> list:
    pdf2image = require_python_dep(
        "pdf2image",
        "pip install pdf2image (also needs poppler; install via brew install poppler or apt-get install poppler-utils)",
    )
    Image = require_python_dep("PIL", "pip install Pillow")  # noqa: F841

    # Prefer delegating to the sibling pdf skill's converter so we stay
    # consistent with its conventions; fall back to pdf2image directly.
    # The sibling script shells out to the same pdf2image library under
    # the hood, so behaviour is equivalent.
    sibling = Path(__file__).resolve().parent.parent.parent / "pdf" / "scripts" / "convert_pdf_to_images.py"
    if sibling.exists():
        notes.append(f"Using sibling pdf skill converter: {sibling}")
    else:
        notes.append("Sibling pdf converter not found; using pdf2image directly.")

    pages = pdf2image.convert_from_path(str(source), dpi=dpi)
    out_pages = []
    for i, page in enumerate(pages):
        out_path = out_dir / f"page_{i + 1}.png"
        meta = normalize_image_page(page, out_path, max_dim)
        meta["dpi"] = dpi
        meta["pageNumber"] = i + 1
        out_pages.append(meta)
    return out_pages


def ingest_image(source: Path, out_dir: Path, max_dim: int, notes: list) -> list:
    Image = require_python_dep("PIL", "pip install Pillow")
    img = Image.Image.open(str(source)) if hasattr(Image, "Image") else None
    # Normal import path (PIL.Image)
    if img is None:
        from PIL import Image as _Image

        img = _Image.open(str(source))
    out_path = out_dir / "page_1.png"
    meta = normalize_image_page(img, out_path, max_dim)
    meta["dpi"] = None
    meta["pageNumber"] = 1
    return [meta]


def main() -> None:
    args = parse_args()
    source = args.get("source")
    out_dir_arg = args.get("out-dir") or args.get("out")
    dpi = int(args.get("dpi", 200) or 200)
    max_dim = int(args.get("max-dim", 1400) or 1400)

    if not source:
        emit_validation_error([{"message": "Missing --source <path>"}])
    if not out_dir_arg:
        emit_validation_error([{"message": "Missing --out-dir <path>"}])

    src = resolve_source(source)
    out_dir = Path(out_dir_arg).expanduser().resolve()
    ensure_output_dir(str(out_dir))

    ext = src.suffix.lower()
    notes: list[str] = []

    try:
        if ext == ".pdf":
            pages = ingest_pdf(src, out_dir, dpi=dpi, max_dim=max_dim, notes=notes)
            fmt = "pdf"
        elif ext in IMAGE_EXTS:
            pages = ingest_image(src, out_dir, max_dim=max_dim, notes=notes)
            fmt = "image"
        else:
            emit_validation_error(
                [
                    {
                        "message": f"Unsupported source extension '{ext}'. Supported: .pdf, {', '.join(sorted(IMAGE_EXTS))}",
                    }
                ]
            )
            return
    except Exception as exc:  # broad: propagate as runtime error envelope
        emit_runtime_error([{"message": f"Ingest failed: {type(exc).__name__}: {exc}"}])
        return

    emit_ok(
        {
            "source": str(src),
            "format": fmt,
            "pages": pages,
            "outDir": str(out_dir),
            "notes": notes,
        }
    )


if __name__ == "__main__":
    main()
