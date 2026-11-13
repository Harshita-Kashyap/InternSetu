# Engine evaluation notes (session 6, v2 data: 2,500 internships, 700 candidates)

Run: `python -m app.scripts.evaluate_engine fairness|sensitivity [--json out.json]`. Synthetic data, no human labels (#24), so these are indicators, not proof.

## Fairness (#27)
- Every candidate gets >= 3 results (100%); 81.1% get at least one fully eligible internship; mean 2.78 eligible in the top 5.
- Remote district vs not: 84.9% vs 80.2% with an eligible result. First generation: 81.1% vs 81.2%. Low English: 82.6% vs 79.7%. **No disadvantage found for these three groups** (the flags are never used for scoring).
- Gaps flagged for review: by profile type, "sparse" profiles (0-1 skills) have an eligible result only 12.3% of the time (everyone still gets close matches), "graduate" 58.3%, versus 98-100% for diploma and ITI. By education level, UG 64.0% vs Diploma 100% / ITI 98.1%.
- Reading: the weak spots are people with few listed skills and general graduates, not the remote or first-generation groups. Likely cause: v2 has many 10th/12th/ITI/Diploma roles and few general-graduate roles. Consider adding more graduate-level listings and the "popular by education + state" fallback (#21).

## Weight sensitivity (#25)
Mean overlap of the top-5 list with the default weights (1.0 = identical):
| weight | set to 0 | -50% | +50% |
|---|---|---|---|
| skills | 0.54 | 0.86 | 0.84 |
| education | 0.77 | 0.92 | 0.95 |
| location | 0.58 | 0.82 | 0.89 |
| industry match | 0.78 | 0.90 | 0.96 |
| role | 0.85 | 0.93 | 0.94 |
- Skills and location matter most (removing either changes about half the list); role matters least. Moderate changes (+/-50%) keep 82-96% of the top 5. All variants still give every candidate >= 3 results.
- This shows how fragile the ranking is. Choosing the "right" weights needs human labels on a validation split (#24).

## After removing role from scoring (#38, session 8)
New default weights: skills 35, education 20, location 20, industry 25, role 0, stipend/duration 0 (first choice, not tuned).
- Fairness is unchanged: 81.1% get an eligible result, remote / first-generation / low-English groups are not disadvantaged; the same weak spots remain (sparse 12.3%, graduate 58.3%, UG 64.0%). Eligibility is a hard filter, so weights cannot fix it; that needs more graduate-level listings (#41).
- Mean top-1 score is 0.503 (was 0.517; scores are not comparable across weight sets).
- Sensitivity (top-5 overlap when the weight is set to 0 / -50% / +50%): skills 0.51 / 0.87 / 0.85, education 0.77 / 0.92 / 0.95, location 0.59 / 0.84 / 0.90, industry 0.75 / 0.90 / 0.98. Still stable under moderate changes, so the 35/25 split is a safe first choice. Every variant still gives all candidates >= 3 results.

## After rebalancing the dataset (#41, session 8)
`build_dataset_v2.py` now balances sectors automatically (50-200 listings each, result 67-144; before 11-301) and gives non-sparse candidates extra skills taken from listings at their education level (distinct candidate skills 48 -> 208). Same seed (42), same counts (2,500 listings, 700 candidates).
- Overall: every candidate still gets >= 3 results; 89.6% get an eligible result (was 81.1%); mean 3.13 eligible in the top 5 (was 2.78).
- By profile type: graduate 91.4% (was 58.3%), basic graduate 98.1%, rural school 97.5%, ITI 100%, diploma 100%, **sparse 5.3% (was 12.3%)**. By education: UG 88.8%, 12th 77.8%, 10th 83.1%.
- **Watch:** gaps between groups grew slightly because the new skills help graduates most: remote district 82.8% vs 90.9%, first generation 86.9% vs 91.2%, low English 85.9% vs 92.8%. All are under the 10-point review limit but are now the numbers to watch, together with 12th pass (77.8%) and sparse profiles.
- Sensitivity (top-5 overlap when a weight is set to 0 / -50% / +50%): skills 0.54 / 0.87 / 0.85, education 0.77 / 0.93 / 0.97, location 0.61 / 0.84 / 0.91, industry 0.74 / 0.91 / 0.99. Unchanged in character.
- These are results on synthetic candidates built by the same script, so the improvement is partly by construction; it says the data is less lopsided, not that real students will do better. Real checks need the pilot (#37) and human labels (#24).
