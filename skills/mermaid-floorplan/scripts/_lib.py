"""Shared helpers for the Python scripts in the mermaid-floorplan skill.

Every script emits a single-line JSON envelope to stdout:

    {"success": bool, "data": {...}|None, "warnings": [...], "errors": [...]}

Exit codes match the Node contract:
    0 — success
    1 — validation or user-input error
    2 — runtime error (missing dependency, I/O)
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Iterable, Sequence

EXIT_OK = 0
EXIT_VALIDATION = 1
EXIT_RUNTIME = 2


def _bootstrap_skill_venv() -> None:
    """Re-exec the current process under the skill's sibling ``.venv`` if
    it exists and we are not already running inside it.

    The skill ships a pinned virtualenv at
    ``.cursor/skills/mermaid-floorplan/.venv`` to host Pillow/pdf2image
    without polluting the system Python. Every Python script in this
    skill imports ``_lib``, so placing the hop here means individual
    scripts never have to worry about interpreter selection.
    """

    here = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(here)
    venv_python = os.path.join(skill_dir, ".venv", "bin", "python3")
    if not os.path.isfile(venv_python):
        return
    if os.path.abspath(sys.executable) == os.path.abspath(venv_python):
        return
    if os.environ.get("MERMAID_FLOORPLAN_SKIP_VENV") == "1":
        return
    try:
        os.execv(venv_python, [venv_python, *sys.argv])
    except OSError:
        return


_bootstrap_skill_venv()


def parse_args(argv: Sequence[str] | None = None) -> dict[str, Any]:
    """Tiny argv parser mirroring the shape of _lib.mjs."""

    argv = list(sys.argv[1:] if argv is None else argv)
    out: dict[str, Any] = {"_": []}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            if "=" in a:
                key, _, val = a[2:].partition("=")
                out[key] = val
            else:
                key = a[2:]
                nxt = argv[i + 1] if i + 1 < len(argv) else None
                if nxt is not None and not nxt.startswith("--"):
                    out[key] = nxt
                    i += 1
                else:
                    out[key] = True
        else:
            out["_"].append(a)
        i += 1
    return out


def emit_and_exit(envelope: dict[str, Any], code: int = EXIT_OK) -> None:
    sys.stdout.write(json.dumps(envelope) + "\n")
    sys.stdout.flush()
    sys.exit(code)


def emit_ok(data: Any = None, warnings: Iterable[dict[str, Any]] = ()) -> None:
    emit_and_exit(
        {
            "success": True,
            "data": data if data is not None else {},
            "warnings": list(warnings),
            "errors": [],
        },
        EXIT_OK,
    )


def emit_validation_error(errors: Iterable[dict[str, Any]] | str, data: Any = None, warnings: Iterable[dict[str, Any]] = ()) -> None:
    errs = _normalize_errors(errors)
    emit_and_exit(
        {"success": False, "data": data, "warnings": list(warnings), "errors": errs},
        EXIT_VALIDATION,
    )


def emit_runtime_error(errors: Iterable[dict[str, Any]] | str, data: Any = None, warnings: Iterable[dict[str, Any]] = ()) -> None:
    errs = _normalize_errors(errors)
    emit_and_exit(
        {"success": False, "data": data, "warnings": list(warnings), "errors": errs},
        EXIT_RUNTIME,
    )


def _normalize_errors(errors: Iterable[dict[str, Any]] | str) -> list[dict[str, Any]]:
    if isinstance(errors, str):
        return [{"message": errors}]
    return list(errors)


def require_python_dep(module: str, install_hint: str) -> Any:
    """Import a Python package and emit a runtime-error envelope if missing.

    Returns the imported module. Never returns on failure.
    """

    try:
        return __import__(module)
    except ImportError as exc:
        emit_runtime_error(
            [
                {
                    "message": f"Missing Python dependency '{module}': {exc}",
                    "hint": install_hint,
                }
            ]
        )


def ensure_output_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)
