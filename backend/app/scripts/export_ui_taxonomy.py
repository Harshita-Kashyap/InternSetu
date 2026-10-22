"""Write data/ui_taxonomy_en.json: {type: {id: english name}} for the web/mobile apps.

The apps keep one file per language (ui_taxonomy_hi.json, ui_taxonomy_mr.json ...) with the SAME ids and translated
names, and fall back to the English name from the API when a translation is missing.
Needs no database:  python -m app.scripts.export_ui_taxonomy
"""
import json
from pathlib import Path

from app.services.dataset_parse import parse_taxonomy

DATA = Path(__file__).resolve().parents[2] / "data"


def main() -> None:
    parsed = parse_taxonomy(json.loads((DATA / "internsetu_taxonomy.json").read_text(encoding="utf-8")))
    out: dict[str, dict[str, str]] = {}
    for e in parsed["entries"]:
        out.setdefault(e["type"], {})[e["id"]] = e["name"]
    path = DATA / "ui_taxonomy_en.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {path} ({sum(len(v) for v in out.values())} names)")


if __name__ == "__main__":
    main()
