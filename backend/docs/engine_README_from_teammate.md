# InternSetu Recommendation Engine

Gives a candidate the **3 to 5 most suitable internships**, with a match percentage, the reasons, and the skills they are missing.

It works on **synthetic** data (750 fictional internships, 350 fictional candidates). It is not connected to the real PM Internship Scheme portal.

---

## 1. What it does

For one candidate profile, the engine does these steps in order:

1. **Eligibility check.** An internship is removed if the candidate lacks **any mandatory skill** or is **below the required education level**.
2. **Scoring.** Each remaining internship gets a match score from six parts: skills 30%, education 25%, location 20%, sector 15%, preferred role 5%, preferences (stipend and duration) 5%.
3. **Ranking.** Internships are sorted best first. The default method ("hybrid") also uses text similarity (TF-IDF and a sentence-embedding model).
4. **Top 3 to 5** are returned, each with:
   - `match_percentage` (how well the profile fits the internship. It is **not** the chance of being selected),
   - `why_recommended`, `considerations`,
   - `skill_gap` (missing skills and related skills the candidate already has),
   - a **"Low match" tag** if the match is below 30%. Low matches are still shown, never hidden.

If nothing is eligible, the answer is an **empty list with a message**. If fewer than the requested number are eligible, fewer are returned.

The match percentage shown to users is always the structured score, even when the ranking uses the hybrid method.

---

## 2. Requirements

- Python 3.x. It was tested with **Python 3.14.7** on Windows 11. Other recent Python 3 versions should work but were not tested. The pinned versions may need small changes.
- About 2 GB of free disk space (the installed packages take about 1 GB, mostly PyTorch).
- Internet access **the first time** you use the `hybrid` or `semantic` method (it downloads the small `all-MiniLM-L6-v2` model, about 90 MB). After that it works offline. The `baseline` and `tfidf` methods never need the model.

---

## 3. Installation

Open a terminal **in the project folder** (the folder that contains this README.md).

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

All package versions are pinned in `requirements.txt`. Installing took about 5 minutes on our test machine.

---

## 4. Use it from Python: `recommend(profile)`

Run this from the project folder:

```python
from src.engine import recommend

profile = {
    "education": {"education_level": "EDU-UG", "field_of_study": "FOS-CSE"},
    "skills": ["SK-PROG-001", "SK-PROG-002"],
    "location_preferences": {"home_location": "LOC-CITY-MUM", "willing_to_relocate": True},
}

result = recommend(profile, k=5, method="baseline")
print(result["count"], result["message"])
for r in result["recommendations"]:
    print(r["rank"], r["title"], r["match_percentage"], r["match_tag"])
```

- `k` is 3, 4 or 5 (default 5).
- `method` is `"hybrid"` (default), `"baseline"`, `"tfidf"` or `"semantic"`.
- Wrong input raises `InputError`. Its `.problems` attribute is a list of plain-English messages.

---

## 5. Use it as an API

### Start the server

From the project folder, with the virtual environment active:

```
python -m uvicorn src.api:app --host 127.0.0.1 --port 8000
```

Wait until you see `Application startup complete.` Start-up loads the model and took about 40 seconds on our test machine (longer if the model must be downloaded first). You may see a harmless warning about "unauthenticated requests to the HF Hub".
Stop the server with `Ctrl + C`.

Check it: open http://127.0.0.1:8000/health in a browser. Interactive documentation is at http://127.0.0.1:8000/docs.

### Endpoints

| Method and path | What it does |
|---|---|
| `GET /health` | Shows that the server is running, how many internships are loaded, and which methods are ready. |
| `POST /recommend` | Body: `{"profile": {...}, "k": 5, "method": "hybrid"}`. Returns the recommendations. `k` and `method` are optional. |
| `POST /internships` | Body: one internship record (see section 8). Adds it to the catalog. Returns `201`. |

### Status codes

| Code | Meaning |
|---|---|
| 200 | Success. This includes the "nothing eligible" case: `recommendations` is `[]` and `message` explains why. |
| 201 | Internship added. |
| 409 | An internship with that ID already exists. |
| 422 | Invalid input. The response lists **every** problem in `details`. |
| 503 | The semantic model could not be loaded. Use `"method": "baseline"` or `"tfidf"`. |

Every error looks like this:

```json
{"error": "The request is not valid.",
 "details": ["education.education_level: 'EDU-MBA' is not a known education level ID. Use an ID from internsetu_taxonomy.json."]}
```

### Try it in Postman

1. Start the server (see above).
2. In Postman choose **Import** and select `postman/InternSetu.postman_collection.json`.
3. Open the collection **InternSetu Recommendation Engine** and run the requests one by one (or use **Run collection**). Each request has a built-in test that turns green when it behaves as expected.
4. If you use another port, change the `base_url` variable (collection, then Variables tab).

The collection contains: health check, a normal profile (hybrid), a normal profile (baseline), a "Low match" example, a **zero-eligible** candidate (empty list), two **invalid input** requests (422), a valid internship to add (201) and an invalid one (422).

The first hybrid request can take a few seconds. Request 8 (add internship) adds a demo internship permanently. Running it twice gives `409`. To undo it, stop the server and delete `data/internships/added_internships.json`.

---

## 6. Input format: candidate profile

All values are **IDs from `data/taxonomy/internsetu_taxonomy.json`**. Free text such as "Python" is not accepted.

```json
{
  "candidate_id": "optional-any-text",
  "education": {
    "education_level": "EDU-PG",
    "degree": "DEG-MPHARM",
    "field_of_study": "FOS-PHARMACY"
  },
  "skills": ["SK-HEALTH-006", "SK-PM-001", "SK-HEALTH-007"],
  "interests": ["INT-004"],
  "preferred_roles": ["ROLE-040"],
  "location_preferences": {
    "home_location": "LOC-CITY-FAR",
    "willing_to_travel": true,
    "willing_to_relocate": true,
    "preferred_locations": ["LOC-CITY-FAR", "LOC-CITY-NAG"]
  },
  "preferences": {
    "preferred_sectors": ["SEC-005"],
    "duration_preference": "2 months",
    "stipend_expectation": {"amount_inr_per_month": 4000}
  }
}
```

| Field | Required? | Notes |
|---|---|---|
| `education.education_level` | **Yes** | One of `EDU-10`, `EDU-12`, `EDU-ITI`, `EDU-DIPLOMA`, `EDU-UG`, `EDU-PG`, `EDU-DOCTORATE`. |
| `education.degree`, `education.field_of_study` | No | Used for the education score. |
| `skills` | **Yes** | List of `SK-...` IDs. It may be empty `[]`, but then the candidate will usually be eligible for nothing. |
| `location_preferences.home_location` | **Yes** | A city ID like `LOC-CITY-MUM`. |
| `willing_to_travel`, `willing_to_relocate` | No | `true` or `false` (default `false`). |
| `preferred_locations` | No | List of city IDs. |
| `interests`, `preferred_roles` | No | Lists of `INT-...` and `ROLE-...` IDs. (`interests` is accepted but not used in scoring.) |
| `preferences.preferred_sectors` | No | List of `SEC-...` IDs. |
| `preferences.duration_preference` | No | One of: 4 weeks, 6 weeks, 8 weeks, 10 weeks, 12 weeks, 1 month, 2 months, 3 months, 4 months, 6 months. |
| `preferences.stipend_expectation.amount_inr_per_month` | No | A number, 0 or more (default 0). |

Other fields (for example a full record from `data/candidates/`) are accepted and ignored.

---

## 7. What a recommendation looks like

```json
{
  "rank": 1,
  "internship_id": "ISU-000015",
  "title": "Pharmacy Intern (Trainee)",
  "company_name": "Rapid Healthcare Pvt Ltd",
  "location": "LOC-CITY-GUR",
  "location_name": "Gurugram",
  "ranking_score": 0.7282,
  "match_percentage": 78.43,
  "low_match": false,
  "match_tag": null,
  "why_recommended": ["Skills: 5 of 7 required/preferred skills matched (...)", "Preferred role matches (Pharmacy Intern)"],
  "considerations": ["Duration (10 weeks) differs from your preference (2 months)"],
  "skill_gap": {
    "missing_mandatory": [],
    "missing_preferred": ["Google Workspace", "Public Health Awareness"],
    "related_skills": [{"missing": "Google Workspace", "you_have": ["Microsoft Excel (Basic)"]}]
  }
}
```

- `ranking_score` is only used for ordering. `match_percentage` is the number to show to users.
- `missing_mandatory` is always empty for recommended internships, because missing a mandatory skill makes the candidate ineligible.
- `related_skills` lists skills the candidate has in the same skill category as a missing one. It is a simple category rule, not a prediction.

---

## 8. Adding internships

Send `POST /internships` with one record:

```json
{
  "internship_id": "ISU-900001",
  "company_name": "Demo Health Pvt Ltd",
  "title": "Pharmacy Intern (Demo)",
  "sector_id": "SEC-005",
  "role_id": "ROLE-040",
  "description": "Demo internship added through the API.",
  "education_requirements": {"education_level": "EDU-UG", "degree": "DEG-BPHARM", "field_of_study": "FOS-PHARMACY"},
  "mandatory_skills": ["SK-HEALTH-005", "SK-HEALTH-008"],
  "preferred_skills": ["SK-HEALTH-004", "SK-OFFICE-003"],
  "location": "LOC-CITY-GUR",
  "duration": "2 months",
  "stipend": {"amount_inr_per_month": 8000}
}
```

- **Required:** `internship_id` (must be new), `title`, `sector_id`, `role_id`, `education_requirements.education_level`, `mandatory_skills`, `preferred_skills` (either can be `[]`), `location`, `duration`, `stipend.amount_inr_per_month`.
- **Optional:** `company_name`, `description`, `application_url`, `degree`, `field_of_study`.
- All IDs must exist in the taxonomy file.
- Added internships are saved in `data/internships/added_internships.json` and are loaded again when the server restarts. The original data file is never changed.
- The new internship is available for recommendations immediately.

---

## 9. How to run the tests

From the project folder, with the virtual environment active:

```
python -m pytest
```

No internet is needed (the model is replaced by a small fake one inside the tests). All tests should pass (123 in this package), in under a minute.

What is tested: data loading, eligibility against the 7,000 labelled pairs (all agree), match percentages against the labelled data (all 1,273 eligible pairs agree), ranking, explanations, the "Low match" tag, the 87 candidates that have no eligible internship (they get an empty list), input validation, every API endpoint with good and bad input, a check that the code never reads ground-truth or `pair_type` data, and that every request in the Postman collection returns the status code it promises.

---

## 10. Results summary

Measured on a held-out **test group of 53 candidates** (split by candidate, fixed seed). The hybrid weights (structured 0.70, TF-IDF 0.20, semantic 0.10) were tuned on a separate validation group of 52 candidates. Ranking was done within each candidate's labelled sample of internships. "Relevant" means a label of 2 or 3. Only the **18 test candidates** who have at least one relevant internship are averaged.

| Method | Precision@3 | Precision@5 | Recall@5 | NDCG@5 | HitRate@5 |
|---|---|---|---|---|---|
| Baseline (weighted structured score) | 0.667 | 0.511 | 0.929 | 1.000 | 1.000 |
| TF-IDF only | 0.556 | 0.467 | 0.889 | 0.927 | 1.000 |
| Semantic only | 0.519 | 0.400 | 0.791 | 0.871 | 0.944 |
| Hybrid (default) | 0.648 | 0.511 | 0.929 | 0.997 | 1.000 |
| Random order of eligible internships | 0.481 | 0.344 | 0.771 | 0.833 | 0.944 |

How to read this:

- The **baseline's perfect score is by design, not proof of quality.** The labelled data was made with the same formula, so the baseline reproduces it exactly.
- The hybrid, TF-IDF and semantic methods are only slightly better than random order. They never saw the labels.
- Only 18 candidates are averaged, so differences of a few points are **not reliable**.
- Recall@3, NDCG@3 and HitRate@3 and the other variants were also measured. The evaluation scripts are kept in the full project folder, not in this handover package.

---

## 11. Known limits

- The data is **synthetic**. Results say nothing about real PMIS internships or real candidates.
- `match_percentage` shows how well a profile fits an internship. It is **not** a chance of selection.
- **87 of the 350** sample candidates (25%) have no eligible internship at all. This comes from the synthetic data and was left unchanged.
- Candidates can only be matched on **IDs from the taxonomy**. There is no free-text or multilingual input yet. That is planned as a future layer in front of this engine.
- The sector score uses `preferred_sectors` only. `interests` is not used.
- The weights (30/25/20/15/5/5) are provisional research values.
- Only the 18-candidate test average is available for comparing methods, so the ranking of the methods is uncertain.
- Eligible internships with a match below 30% are shown with a "Low match" tag instead of being hidden.
- Added internships are saved in a JSON file. The server handles one request at a time (internally locked). This is fine for demos, not for heavy traffic. The server has no login.
- The embedding cache (`.cache/`) is created on first use and is safe to delete.

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'src'` | Run the command from the project folder (the one containing `src/`). |
| PowerShell says running scripts is disabled when activating the virtual environment | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate again. Or skip activation and call `.\.venv\Scripts\python.exe` directly. |
| Creating the virtual environment fails with an `ensurepip` error | This happened when the project was in a very deeply nested folder (long Windows path). Move the project to a short path such as `C:\internsetu` and try again. |
| `python` is not found | Install Python 3 and tick "Add Python to PATH", or try `py` (Windows) or `python3` (macOS/Linux). |
| `pip install` fails or is very slow | Check your internet connection and free disk space. PyTorch is a large download. |
| `503` from `/recommend` with a message about the semantic model | The model could not be downloaded. Connect to the internet once, or use `"method": "baseline"` or `"tfidf"`. |
| First request or server start is slow | The model is loading. Later requests are fast. |
| `Address already in use` / port 8000 is busy | Start with another port, for example `--port 8001`, and change `base_url` in Postman. |
| `409` when adding an internship | That `internship_id` already exists. Use a new one. To reset demo additions, stop the server and delete `data/internships/added_internships.json`. |
| `422` response | Read the `details` list. Each line names the field and the problem. IDs must come from `data/taxonomy/internsetu_taxonomy.json`. |
| Empty `recommendations` with a "No eligible internships" message | Not an error. The candidate lacks mandatory skills or education for everything in the catalog. |

---

## 13. Project layout

```
src/            engine code (eligibility, matching, semantic, ranking, explanation, api.py, engine.py)
data/           taxonomy, internships, sample candidates, and the labelled pairs/ground truth used by the tests
postman/        Postman collection
tests/          automated tests
requirements.txt, pytest.ini, README.md
```
