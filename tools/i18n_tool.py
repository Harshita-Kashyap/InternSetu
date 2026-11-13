#!/usr/bin/env python3
"""Translation helper for the web app (web/messages/<lang>.json).

  python tools/i18n_tool.py status                  # how much of each language is translated
  python tools/i18n_tool.py export bn [--all]       # CSV of strings still missing in Bengali (stdout)
  python tools/i18n_tool.py import bn file.csv      # merge a translated CSV into web/messages/bn.json

Workflow for a new language (no coding): export -> paste the CSV into an AI model with the prompt in
docs/ADDING_A_LANGUAGE.md -> save its answer as a CSV -> import. A new language file starts as a copy of English,
so anything not translated yet simply shows in English. Then add the code to web/i18n/routing.ts and
web/app/components/LanguageSwitcher.tsx.
"""
import csv, io, json, sys
from pathlib import Path

MSG = Path(__file__).resolve().parents[1] / "web" / "messages"
NS = "UI"


def load(lang):
    p = MSG / f"{lang}.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def status():
    en = load("en")[NS]
    for p in sorted(MSG.glob("*.json")):
        lang = p.stem
        if lang == "en":
            continue
        d = json.loads(p.read_text(encoding="utf-8"))[NS]
        done = sum(1 for k, v in en.items() if k in d and d[k] != v)
        print(f"{lang}: {done}/{len(en)} translated ({100 * done // len(en)}%), identical-to-English: {len(en) - done}")


def export(lang, everything=False):
    en = load("en")[NS]
    cur = (load(lang) or {}).get(NS, {})
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["key", "english", "translation"])
    for k, v in en.items():
        if everything or k not in cur or cur[k] == v:
            w.writerow([k, v, "" if k not in cur or cur[k] == v else cur[k]])
    sys.stdout.write(out.getvalue())


def import_(lang, path):
    en = load("en")
    data = load(lang) or json.loads(json.dumps(en))        # new language = copy of English (fallback)
    n = bad = 0
    for row in csv.DictReader(open(path, encoding="utf-8", newline="")):
        k, t = row["key"], (row.get("translation") or "").strip()
        if not t or k not in en[NS]:
            continue
        # placeholders such as {name} must survive translation
        import re
        if sorted(re.findall(r"\{\w+\}", en[NS][k])) != sorted(re.findall(r"\{\w+\}", t)):
            bad += 1
            print(f"skipped (placeholders differ): {k}", file=sys.stderr)
            continue
        data[NS][k] = t
        n += 1
    (MSG / f"{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"imported {n} strings into {lang}.json ({bad} skipped)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["status"]:
        status()
    elif a[:1] == ["export"] and len(a) >= 2:
        export(a[1], "--all" in a)
    elif a[:1] == ["import"] and len(a) == 3:
        import_(a[1], a[2])
    else:
        print(__doc__)
