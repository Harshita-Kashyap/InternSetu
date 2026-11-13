"""Load the taxonomy and synthetic datasets into the database.

From the backend folder (after `alembic upgrade head`):
    python -m app.scripts.load_datasets --all
Optional:  --coordinates data/locations_coordinates.csv
"""
import argparse
from pathlib import Path

from app.core.database import SessionLocal
from app.services import dataset_loader as loader

DATA = Path(__file__).resolve().parents[2] / "data"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="taxonomy + coordinates + internships + candidates from ./data")
    ap.add_argument("--taxonomy"), ap.add_argument("--internships"), ap.add_argument("--candidates")
    ap.add_argument("--coordinates")
    ap.add_argument("--dataset", choices=["v1", "v2"], default="v2", help="with --all: v2 (default) = rebuilt PMIS-style data in data/v2; v1 = the original 750/350 files")
    a = ap.parse_args()
    if a.all:
        v2 = a.dataset == "v2"
        a.taxonomy = a.taxonomy or DATA / ("v2/internsetu_taxonomy_v2.json" if v2 else "internsetu_taxonomy.json")
        a.coordinates = a.coordinates or DATA / ("v2/locations_coordinates_v2.csv" if v2 else "locations_coordinates.csv")
        a.internships = a.internships or DATA / ("v2/internsetu_internships_v2.json" if v2 else "internsetu_synthetic_internships_v1.json")
        a.candidates = a.candidates or DATA / ("v2/internsetu_candidates_v2.json" if v2 else "internsetu_synthetic_candidates_v1.json")

    with SessionLocal() as db:  # order matters: taxonomy first
        if a.taxonomy:
            print("taxonomy:", loader.load_taxonomy(db, a.taxonomy))
        if a.coordinates:
            print("city coordinates:", loader.load_coordinates_csv(db, a.coordinates))
        if a.internships:
            print("internships:", loader.load_internships(db, a.internships))
        if a.candidates:
            print("candidates:", loader.load_candidates(db, a.candidates))


if __name__ == "__main__":
    main()
