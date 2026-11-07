# How the teammate's engine is plugged in

* The engine source from `internsetu_engine_handover/src/` now lives in `app/engine/` (their code and folder layout,
  relative imports unchanged). Their README is kept as `docs/engine_README_from_teammate.md`. Their tests, labelled
  pairs and ground-truth files were NOT copied (about 14 MB); keep running those in their own project.
* **One backward-compatible edit** in `app/engine/engine.py`: `RecommendationEngine.__init__` now also accepts
  `taxonomy_data=` and `internships=`. With neither given it behaves exactly as before. The backend uses this to feed the engine
  from the database instead of JSON files. Please ask your teammate to merge the same 3 lines upstream so the copies do not drift:
  ```python
  def __init__(self, added_file=ADDED_FILE, embedding_model=None, hybrid_weights=None, taxonomy_data=None, internships=None):
      self.tax = Taxonomy(taxonomy_data if taxonomy_data is not None else load_taxonomy())
      self.internships = dict(internships) if internships is not None else load_internships()
  ```
* `app/services/engine_adapter.py` turns database rows into the engine's dicts and adds what the apps need
  (apply link, skill ids, nearest internships, demo flag). `app/services/recommendations.py` builds the engine once from the
  database (active internships only) and calls it. `tests/test_engine_adapter.py` proves it gives identical results to the
  engine reading the original JSON files.
* The engine's own add-internship JSON file and its own server (`src/api.py`) are not used. Internships are managed in the
  database. After the catalog changes, call `reset_engine()` (a later admin screen will do this) or restart the server.
* Default method is `baseline` (no model download, instant). Their results show it ranks as well as `hybrid`. To use the
  others: set `MATCHING_METHOD=hybrid` in `.env` and `pip install -r requirements-ml.txt`.
* Their package pins Python 3.14 package versions; this backend uses open ranges (`numpy`, `scikit-learn`), so use whatever
  Python 3.11 to 3.13 you already have.
* The engine reads candidate **skills** only (not language skills or interests) for scoring. Interests are stored but not scored,
  exactly as in their README.
