# InternSetu – Work Log (audit follow-up)

Source of truth for: **done**, **in progress**, **next**. Priorities follow the audit (P0 first).
**Current state (session 11):** all suites were run: backend 162 passed; web `tsc` + 17 Vitest + `next build`; mobile `tsc` + 13 Jest. Latest entries are at the bottom (sections 13 and 14). Older verification notes below (e.g. "not run") describe earlier sessions and were cleared in sessions 10-11.
Not yet done by anyone: walk-through on a real phone/browser, Lighthouse/TalkBack audit, native-speaker review of hi/mr/bn text, real email sending (needs SMTP keys).

## 1. Done

| # | Item | What changed |
|---|---|---|
| 1 | PMIS rules as config | `backend/data/pmis_rules.json` (age 18-25, income limit 12 lakh, 6/9 months, Rs 9,000 stipend). **Sources disagree – verify on pminternship.mca.gov.in.** |
| 2 | PMIS pre-check (backend) | `services/pmis_rules.py`, public `GET /pmis/rules`, `POST /pmis/precheck`; stateless, answers in en/hi/mr, "hint only" wording |
| 3 | Always 3-5 results | `engine/tiers.py`: eligible first, then "close matches" (education OK, 1-2 mandatory skills missing). `close_matches=false` = old strict mode. Result on synthetic data: all 350 candidates get >=3 results (before: 55% had <3) |
| 4 | Softer skill gate | Done through the close-match tier (the dataset's mandatory skills are not yet re-classified) |
| 5 | Sector choice counts | Up to 3 chosen sectors each get a slot when anything exists in them (622/622 checkable cases) |
| 7 | Stipend/duration not scored | Default weights now 30/20/20/20/10/0; "Stipend/Duration" considerations removed from explanations; admin defaults updated |
| 11 | "Learn one skill, unlock N" | `skill_unlocks` in the API + panel on the web recommendations page; `skill_gap_summary` kept |
| 6 (partly) | Interests optional | No longer required on web (skills page, summary) and mobile; hint text explains the purpose |
| 12 (partly) | Explanations in hi/mr | New close-match sentences, messages and labels added to `localize.py` |
| 33 | Repo hygiene | Removed `__pycache__`, `tsbuildinfo`, stale `web/api.ts|store.ts|taxo.ts`, committed `web/.env.local`; `.gitignore` extended |
| - | Docs | Root, backend, web, mobile READMEs updated |
| - | Tests | New `tests/test_tiers_and_pmis.py`; `test_recommendations_api.py` adjusted (strict-mode and close-match tests) |

## 2. In progress / partly done
- **Interests vs Sectors wording**: interests are optional now, but the two screens still exist. Decide: merge into one "industries" question, or keep interests only as a tie-breaker.
- **Mobile parity**: only the optional-interests change is ported.
- **Skill gate**: re-classify dataset skills (<=2 mandatory) when the dataset is rebuilt.

## 3. Next (priority order, short how-to)
*(Items #38–#42 were added later: see section 10.)*
**P0**
1. PMIS pre-check screens (web + mobile): 5 yes/no questions calling `POST /pmis/precheck`, show `summary` + `blockers[lang]`, link to `official_url`.
2. Port close-match tag + "learn one skill" panel to mobile (`RecommendationsScreen`, `JobCard`; add `t()` strings in `i18n.tsx`).
3. Rebuild dataset (2,000-3,000 internships by script): PMIS sector mix incl. Oil & Gas, many 10th/12th/ITI/Diploma roles with 1-2 mandatory skills, 6/9-month durations, fixed Rs 9,000 stipend, small-town locations, facilities (food/stay/transport). Then rebalance candidates (low-skill, everyday-skill, remote districts).
4. Activity-based skills picker ("what have you done?") mapped to taxonomy skills, with Hindi/Marathi search and icons.
5. Link each skill to a free course (SWAYAM/NPTEL/Skill India) in the "learn" panel.

**P1**
6. More languages: send reason codes + params from backend, translate in apps; add Prompt-4 multilingual inputs.
7. Voice: read-aloud and voice input (Web Speech API / native TTS); icon-led one-question-per-screen steps; plain-language rewrite (grade 6) and test with 5-10 real users.
8. Phone/OTP login and real password reset; email optional.
9. Low bandwidth: cache last recommendations, retry, smaller images, PWA.
10. Accessibility pass (WCAG 2.2 AA): aria labels, contrast, 16px text, 44px targets, TalkBack/VoiceOver, axe tests.
11. Location logic: no hard zero for "nearby only"; show distance; use facilities as a filter.
12. Cold-start fallback for sparse profiles (popular entry-level by education + state).
13. Hand-off to PMIS: deep link + document checklist (never store Aadhaar).

**P2**
14. Hybrid scorer by default (or TF-IDF + structured with interests in text).
15. Independent evaluation: human-label 300-500 pairs; report precision@5, NDCG, share of candidates with >=3 results; ablate weights on a validation split.
16. Synthetic context flags (remote, first-generation, low English) for fairness checks only, never for scoring.
17. Automate the dataset audit (Prompt 7) in CI; cap explanations at 3 reasons + 1 "improve" item; validate admin CSV imports.

**P3**
18. DPDP: local-language privacy notice, retention period, treat income/family-job answers as sensitive.
19. Persistent login lockout/rate limit (Redis/DB), reset tokens with expiry.
20. Tests: sector recall, cold start, weight regression, e2e register->results, accessibility, load test (3 s target); CI, monitoring, admin audit log, alembic in Docker.
21. Pilot with 10-20 real users from the target groups and iterate.

## 4. Things to confirm with the project owner
- Which PMIS age/income/duration rules to treat as official (sources conflict).
- Whether Interests should be removed or kept as a tie-breaker.
- Whether the close-match tier should also apply to the Discover list (currently only to Top matches).


## 5. Session 2 (4 Nov 2026)
**Done**
- Ran the API test suite for the first time; fixed one test bug. Full backend suite: 114 passed. Web: tsc clean, 15 vitest tests pass. Mobile: tsc clean (jest not run).
- #2 PMIS pre-check: web `/pmis-check`, mobile `PmisCheckScreen`, `api.pmisRules/pmisPrecheck`, styles, Hindi/Marathi strings (web `messages/*.json`, mobile `i18n_extra.ts`).
- #8/#9: `backend/app/scripts/build_dataset_v2.py` (deterministic, `--seed 42`) writes `backend/data/v2/` (additive taxonomy, coordinates, 2,500 internships, 700 candidates). Load with `python -m app.scripts.load_datasets --all --dataset v2`.
- #28: `backend/app/scripts/audit_dataset.py --dataset v2|v1` (CI-ready exit code).
- Engine: "9 months" added to `DURATION_WEEKS`.
- #5 backend: `only_my_sectors` on `/me/recommendations` (engine, service message, schema field, localized message).
- New tests: `tests/test_dataset_v2.py` (7), only-sectors tests in `test_tiers_and_pmis.py` and `test_recommendations_api.py`.

**Notes**
- v2 town coordinates are approximate. New taxonomy entries have no Hindi/Marathi names yet.
- v1 files and the 7,000 labelled pairs are unchanged; v2 has no ground-truth labels (see #24).
- Web `messages/*.json` were rewritten by a script, so diffs show formatting noise.

**In progress / next**
1. Toggle "Only my industries" + "nothing fits" message on web and mobile recommendations screens.
2. Make v2 the default dataset; re-classify dataset skills (#4); re-label (#7, #24).
3. "Close match" label on Discover; #10/#11; then #29, #30.


## 6. Session 3 (5 Nov 2026)
**Done**
- #6 Interests removed everywhere users see them: web (skills page, edit profile, profile summary, stepper label, consent and privacy text, admin type list), mobile (skills and edit screens, store, API types), backend (`interest_ids` no longer stored or returned; old apps can still send it, it is ignored). Hindi/Marathi text updated. Interests were never part of scoring (the "interest_sector" weight is the chosen industries only; its admin label is now "Industry match").
- #5 finished: "Only my industries" toggle on web and mobile recommendations screens.
- Close-match label on Discover (web) and job cards (mobile): not eligible, education fits, at most 2 skills missing.
- Tests: backend 115 pass (new test for retired `interest_ids`); web tsc clean, 15 vitest pass; mobile tsc clean (jest not run).

**Notes**
- The mobile Close-match text keeps the red "not eligible" colour; only the web uses a warning colour.
- v2 dataset is still opt-in (`--dataset v2`); v1 stays the default so existing tests and labelled pairs keep working.

**Next**
1. Make v2 the default, re-classify dataset skills (#4), re-label (#7, #24).
2. #10/#11 skills picker and course links. 3. #29, #30. 4. #12-#22.


## 7. Session 4 (5 Nov 2026)
**Done**
- #30 Admin CSV import validation (size, row count, duplicates in file and against existing listings, repeated external_id, mandatory cap of 2, duration, stipend range, URL, text length) + tests.
- #29 Explanations capped at 3 reasons + 1 improvement tip (`explain._cap`), ranked by usefulness; test over 80 candidates.
- v2 is now the default for `load_datasets --all` (`--dataset v1` for the old files). Backend README updated.
- #10 Activity picker: `backend/app/scripts/build_activity_map.py` -> `data/activity_skill_map.json` (29 activities, en/hi/mr, icons); `GET /taxonomy/activities` (hides skills not loaded); tiles on web and mobile skills screens; tests.
- #11 Course links: `app/services/courses.py` (SWAYAM + YouTube search links) added to `skill_unlocks`; web panel shows them; new mobile panel "Learn one skill, unlock more internships".
- #22 (partly): `GET /pmis/handoff` + checklist on the pre-check result (web, mobile), en/hi/mr.
- #21 (partly): cold-start fallback in `engine/tiers.select_tiered` (`MIN_RESULTS=3`): too few matches -> add education-fit internships with more missing skills. Test added.
- Tests: backend 122 pass; web tsc clean + 15 vitest; mobile tsc clean (jest not run).

**Notes**
- Course links are search links, not specific courses. Replace with curated links if the team has them.
- Hindi/Marathi strings for the new UI text were written by me; have a native speaker review them before the pilot.
- The "Close match" colour on mobile still uses the red style.

**Next**
1. #12 + #16 + #29: reason codes and plain wording. 2. #20, #21, #22. 3. #13-#19. 4. #23-#28. 5. #31-#37.


## 8. Session 5 (5 Nov 2026)
**Environment limits this session:** no network, so FastAPI/pydantic/pytest and npm packages could NOT be installed. Only pure-Python tests were run (via a small pytest stand-in, not part of the repo). API tests, web (tsc/vitest) and mobile (tsc/jest) were **not run**. First thing next session: `cd backend && pytest`, `cd web && npx tsc --noEmit && npx vitest run`, `cd mobile && npx tsc --noEmit`.

**Done**
- #12 + #29 + #16 (server side): reason codes.
  - New `backend/app/engine/explanation/reasons.py`: ONE table, code -> English / Hindi / Marathi sentence, in plain words (no "mandatory", "eligibility", "relocate"). `make()`, `render()`, `render_all()`.
  - `explain.py` rewritten: builds `(code, params)` reasons, caps them (3 reasons + 1 tip), and returns both text and codes (`why_codes`, `consider_codes`). Not-eligible detail now lists each problem separately (`NEED_SKILLS`, `EDU_TOO_LOW`) using education *names* instead of IDs.
  - `eligibility.py`: new `eligibility_reasons()` (the old `check_eligibility` text is unchanged because `browse` still reads it).
  - `localize.py`: sentences are rebuilt from the codes for hi/mr (`why_codes`->`why_recommended`, `consider_codes`->`considerations`, `reason_codes`->`reason`). The old regex table still handles messages, labels and the disclaimer.
  - API: `why_codes`, `consider_codes` on recommendation items and internship detail; `reason_codes` on `nearest`. Old fields are unchanged, so old apps keep working. `ReasonCode` type added (optional) to `web/app/lib/api.ts` and `mobile/src/api.ts`.
  - 4 list messages rewritten in plain English with matching hi/mr rules (`CLOSE_MESSAGE`, "No internship fits this profile yet...", "Only N internship(s) fit you fully...", "No internship matches your current skills...").
- Tests: new `tests/test_reasons.py` (11 tests: every code has en/hi/mr with identical placeholders, no jargon, no leftover `{}` over 150 real explanations, caps, close-match tip, localize from codes, nearest reason, messages). One assertion updated in `test_tiers_and_pmis.py` (new wording). One API test added to `test_recommendations_api.py` (**not run**).
- Verified (pure Python): 54 tests pass across all runnable modules; the only failure is `test_pmis_handoff...` (needs pydantic); 7 modules were skipped because fastapi/sqlalchemy/bcrypt are not installed here.

- #20 location logic (backend only, additive; scoring unchanged):
  - `engine/geo.py` (haversine), `Taxonomy.city_coords` (note: `engine/taxonomy.py` uses CRLF line endings, kept), coordinates passed from the DB into the engine taxonomy (`recommendations._build_engine`, `engine_adapter.build_taxonomy`).
  - `engine_adapter`: `distance_km()`, `nearby_summary()` (NEARBY_KM=100, FEW_NEARBY=3), `FACILITY_GROUPS`, `has_facilities()`.
  - API: `distance_km` on recommendation items, browse items and detail; `nearby_count`, `location_message` on `/me/recommendations`; `facilities` query parameter on `/me/internships`. hi/mr rule for the message; `location_message` added to localized keys.
  - Tests: new `tests/test_location.py` (7, pass) + one API test in `test_recommendations_api.py` (not run). On v2 data only 6 of 456 "stay near" candidates get the "few nearby" note.
  - Optional fields added to `web/app/lib/api.ts` and `mobile/src/api.ts` types. **No screen shows them yet.**

- #21 (partly): "Starter" label for cold-start picks (3+ skills missing): `STARTER` reason code, `starter` + `tier_label="Starter"` in the API, `STARTER_MESSAGE`, hi/mr strings, web badge + `UI.starter` key in all three message files (key parity kept). `tier` stays `"near"` so old apps are unaffected. Test added (`test_cold_start_picks_are_labelled_starter...`).

**Notes / caveats**
- `backend/openapi.json` and `backend/data/docs/api-client.ts` are generated/copied files and do NOT yet list the new fields. Regenerate when FastAPI is installed.
- Hindi/Marathi sentences were written by me; have a native speaker review (same as session 4 strings).
- The education sentence no longer shows the level name (it produced nested brackets like "(Undergraduate (UG))"); the level is still in the code's `level` parameter.

**Next**
1. Run all test suites (see top of this section) and fix anything the sandbox could not check.
2. #16 app-screen wording pass (web `messages/*.json`, mobile `i18n.tsx` + `i18n_extra.ts`), then a 5-10 user comprehension test.
3. #20 app screens (show `distance_km`, `location_message`, facilities filter chips); finish #21 (starter label) and #22 (checklist from Apply button).
4. #13-#15, #17-#19, #23-#28, #31-#37 as listed in CHANGE_TRACKER.md.

**End-of-session-5 status (for the next session):** tracker 37 items: ✅ 15 · 🟡 8 (#16, #20, #21, #22, #26, #28, #34, #36) · ⬜ 14. Work this session: #12, #29 finished; #16, #20, #21 advanced. Nothing was run against FastAPI/Postgres, web or mobile toolchains (no network) - run the three test commands at the top of section 8 first.


## 9. Session 6 (5 Nov 2026)
**Environment:** network worked this time, so every suite was run for the first time since session 4.

**Test baseline:** backend **146 passed** (143 + 3 new); web `tsc` clean + **16 vitest**; mobile `tsc` clean + **13 jest**.
- Fixed one wrong path in `test_location_fields_and_facilities_filter` (`/me/internships`, not `/internships`).
- Mobile: `package-lock.json` did not match `package.json` (`npm ci` failed), so it was regenerated with `npm install --legacy-peer-deps`; added devDependency `@react-native/jest-preset@0.88.1` (jest-expo needs it) and `testTimeout: 30000` (first run was slow and one test timed out).
- `backend/openapi.json` regenerated (24 -> 40 paths). `backend/data/docs/api-client.ts` is an old generic copy and still does NOT list the new fields; use `web/app/lib/api.ts` as the reference.

**Done**
- #20 screens: "N km away" tag on web + mobile cards and modal; `location_message` notice on top matches (web + mobile); "Must offer" facility chips (Food / Stay / Transport / Travel allowance) on Discover (web + mobile; `facilities` param added to both `browse()` clients).
- #21: mobile top-matches now shows the "Close match" / "Starter" tag (`tier`, `starter` added to the mobile type).
- #22: new `ApplyHelp` component (web + mobile): collapsible "Documents to keep ready" list next to every Apply button (Discover, top matches, Check-match modal). Nothing is stored.
- #16 (partly): reworded "relocate" -> "move to another city", "Taxonomy" -> "Lists", "synthetic data" -> "sample data" in en/hi/mr on web and mobile; web test blocks `relocat|taxonom|mandatory` in English UI text.
- #27 + #25: `app/scripts/evaluate_engine.py` (`fairness`, `sensitivity`) + `tests/test_evaluate_engine.py` (3 tests, incl. "context flags never change results"). Findings in `backend/data/docs/EVALUATION_NOTES.md`.
- New UI strings added in en/hi/mr (web `messages/*.json`, mobile `i18n_extra.ts`). Hindi/Marathi were written by me: native-speaker review needed.

**Findings worth acting on**
- Remote / first-generation / low-English candidates are NOT disadvantaged. "sparse" (12% get an eligible result) and general "graduate" (58%) profiles are; add graduate-level listings or the popular-by-education fallback.

**Not run / caveats**
- Web `next build` and any real device / emulator run were not done; only tsc, vitest, jest.
- "Eligible / Not eligible" wording is unchanged; decide with real users (#16, #37).

**Next**
1. #16: remaining app wording + 5-10 user comprehension test. 2. Add graduate-level v2 listings / popular-by-state fallback (#21). 3. #13-#15, #17-#19 (languages, voice, icon-led screens, OTP, low bandwidth, accessibility). 4. #23, #24 (human labels), #31-#37.


## 10. Session 7 (5 Nov 2026): review and new to-do items (planning only, no code changed)

**Reviewed:** the role score, account deletion, and the v2 dataset vocabulary. Five new items were added to `CHANGE_TRACKER.md` (#38–#42). Tracker is now 42 items: ✅ 15 · 🟡 10 · ⬜ 17.

**Findings**
- **Role (10 points) is never asked in the apps.** `role_score` gives 1.0 for an exact preferred role, 0.5 for the same role domain, 0 otherwise. The API has `preferred_role_ids`, and the v2 candidates all have preferred roles, but no web or mobile screen collects them. Real users therefore score 0 on role (about 90 maximum). The evaluation on synthetic candidates does not show this.
- **Account deletion exists only in the backend.** `DELETE /me`, `GET /me/export` and `DELETE /me/consent` are built, but no screen or API-client method uses them, and the privacy page still says withdrawal controls "will be added". The README feature list says users can delete and export, which is only true of the API. Deletion currently checks the password, which will not work for OTP-only users (#17).
- **Dataset vocabulary (v2):** 320 skills, 26 sectors, 83 roles, 123 cities. Internships use 298 skills (193 as mandatory); candidates use only 48 distinct skills; the activity picker covers 29 activities and 43 skills. Sectors: Legal & Compliance 11 listings, Aviation 28, Renewable Energy 29, Education 31, against Banking/Finance 301 and Oil & Gas 201. More candidates and internships did not widen skill coverage, so the evaluation looks better than real use will.

**To do (details and how-to are in the tracker)**
1. **#38 Remove role from scoring (decided):** set default weights to 35/20/20/25/0/0 in `engine/matching/components.py` and `services/admin.py` (keep `role` as a zero-weight key); stop emitting the `ROLE_MATCH` reasons in `explain.py`; keep `preferred_role_ids` accepted and ignored; update the admin label, README, backend README and weight tests; re-run `evaluate_engine.py` sensitivity and fairness and update `EVALUATION_NOTES.md`.
2. **#39 Account settings screen:** delete account, download my data, withdraw consent; API-client methods; warning and confirm step; log out and clear cache; update the privacy page; verify the cascade removes profile and saved internships; tests.
3. **#40 OTP confirmation for deletion:** when #17 is built, replace the password check with a fresh OTP for users who have no password; short expiry, single use, rate-limited; audit-log the event without personal data. Depends on #17 and #39.
4. **#41 Dataset balance and coverage (decided: fix first, add later only if needed):** keep the 26 sectors and rebalance to 50–200 listings each; widen candidate skills from 48 to at least 150 and the picker from 29 activities / 43 skills to about 60 activities / about 150 skills (start from the 193 mandatory skills); use or remove the 22 unused skills; add hi/mr names and aliases; rebuild v2, re-run `audit_dataset.py`, fairness and sensitivity, update `test_dataset_v2.py`. Add new skills or sectors only for real gaps (audit gap list, repeated "Other" entries flagged in the admin console, or pilot feedback).
5. **#42 Smooth workflow and UI/UX pass:** walk register → results on both apps, add loading, empty, error and offline states, keep one consistent design and wording, fix the red "Close match" colour on mobile and the "Eligible" wording, run web `next build` and device checks, keep a per-screen checklist, test with 5–10 real users.

**Also changed in the tracker:** notes added to #17 (OTP deletion) and #31 (deletion and export are backend-only), #37 now also needs #38, #39 and #42, and the suggested order has a new step 6.

**Owner decisions (answered, session 7)**
- **Role:** whatever is simpler and best for the aim. Decision: remove role from scoring and ask no question. Reasons: "role" is jargon for the target users; it adds a step to a flow meant to be one simple question at a time; the skills picker and chosen industries already show intent; and weights that change per person make scores hard to compare, explain and evaluate. Its 10 points go to skills (+5) and industry (+5). The `role` key stays at weight 0 so it can be switched back on after the pilot.
- **Dataset skills and sectors:** fix sector balance and skill coverage first, then add new entries only if still required (#41).
- **Account deletion:** confirm with a fresh OTP for users without a password (#40).

**Still to decide**
- Fix the README wording about deletion and export now, or after #39 is built?
- Confirm the 35/20/20/25 split after the sensitivity run (it is a first choice, not tuned).


## 11. Session 8 (6 Nov 2026)
**Tests:** backend **148 passed** (146 + 2 new); web `tsc` clean + **16 vitest**; mobile `tsc` clean + **13 jest**. Fresh unzip needed `npm ci` (web) and `npm ci --legacy-peer-deps` (mobile).

**Done**
- **#38 role removed from scoring:** `WEIGHTS` in `engine/matching/components.py` and `DEFAULT_WEIGHTS` in `services/admin.py` are now skills 35, education 20, location 20, industry 25, role 0, stipend/duration 0. The `ROLE_MATCH` / `ROLE_RELATED` reasons are no longer emitted. `preferred_role_ids` is still accepted and ignored. Admin label says role is not used for now. README and backend README updated; `test_weights_must_total_100` and a new role-weight test updated. Re-ran the evaluation: fairness unchanged (81.1% get an eligible result; same weak spots), sensitivity stable; numbers added to `backend/data/docs/EVALUATION_NOTES.md`. Caveat: a database where an admin already saved weights keeps them; use the admin Reset to get 35/20/20/25.
- **#39 Account settings:** web `/account` page and mobile `Account` screen with Download my data (web: JSON file; mobile: system share sheet, no new package), Withdraw my consent (then goes to the consent screen), Delete my account (password + confirm step, then logs out). New `exportData` / `deleteAccount` (and mobile `withdrawConsent`) client methods, an "Account" tab in both headers, en/hi/mr text, privacy page sentence replaced. New backend test checks that deleting an account removes the profile and saved internships and that the same email can register again with an empty profile. The README claim about export and deletion is now true on both apps.

**Not done / caveats**
- Not run on a device or browser; no `next build`. Hindi/Marathi strings are mine and need a native-speaker check.
- Deletion still needs the password (OTP-only users: #40 with #17).
- Mobile "Eligible" wording, the red Close-match colour and the real-user test (#42, #16) remain.

**Next:** #41 (dataset balance: rebalance the 26 sectors to 50-200 listings, widen candidate skills 48 -> 150+, picker to ~60 activities / ~150 skills, add graduate-level listings, re-run audit, fairness and sensitivity), then #42 UI/UX pass, then #13-#19.

### Session 8, part 2: #41 dataset balance and coverage
- `app/scripts/build_dataset_v2.py`: new `balance_boost()` finds per-sector weights (and favours roles of thin sectors) so every sector gets 50-200 listings; result 67-144 (was 11-301). Calibrated on the same seed as the real build, so the numbers are exact. Non-sparse candidates now get 1-3 extra skills from listings at their education level: distinct candidate skills 48 -> 208. Counts and seed unchanged (2,500 / 700 / 42). Dataset files in `backend/data/v2/` regenerated.
- New test `test_sector_balance_and_candidate_skill_coverage`. Backend now **149 passed**. Audit: low-education share 70.5%, Oil & Gas 5.8%, no errors.
- Evaluation after the change (details in `EVALUATION_NOTES.md`): eligible-result share 81.1% -> 89.6%; graduate profiles 58% -> 91%; sparse 5.3%. Group gaps grew a little (remote 82.8% vs 90.9%, low English 85.9% vs 92.8%), still under the 10-point limit; watch them.
- **Not done in #41:** the activity picker (29 -> ~60 activities) in `build_activity_map.py` and the apps, unused skills, hi/mr names for new skills.
- Caveat: results come from synthetic candidates built by the same script, so part of the gain is by construction.

**Next:** finish #41 (activity picker), then #42 UI/UX pass (consistent design, loading/empty/error/offline states, "Eligible" wording, red Close-match colour, `next build`, device test), then #13-#19.

### Session 8, part 3: activity picker and first #42 fixes
- `app/scripts/build_activity_map.py`: 34 new plain-language activities (factory, pumps and pipes, building sites, drawing plans, stores, deliveries, gardening, farm advice, water and waste, panchayat office, hotel, trips, medical shop, teaching, bank, Tally/GST, calls, sales, social media, posters, video, writing, translation, surveys, charts, HR, legal, risk, computers, programming, AI, electronics). Now **61 activities covering 183 skills** (was 29 / 43), each with en/hi/mr labels. `data/activity_skill_map.json` regenerated; the apps read it from the API, so no data copy to update.
- Web skills page and mobile Skills screen show the first 16 activities with "Show more activities" / "Show fewer activities"; activities the user already chose always stay visible. Strings added in en/hi/mr.
- Mobile match sheet: the red "Not eligible" callout is now amber (less alarming for close matches). Text unchanged.
- `next build` run for the first time: passes, all routes build (incl. `/account`).
- New test `test_activity_picker_coverage`. Totals: backend **150 passed**, web `tsc` clean + **16 vitest**, mobile `tsc` clean + **13 jest**.
- **Not done:** device/emulator and browser walk-through, "Eligible" wording decision, unused skills, hi/mr names for new skills, native-speaker review of all Hindi/Marathi text added in sessions 6-8.

**Next:** #42 walk-through (loading / empty / error / offline states, progress on multi-step screens, consistent buttons and 16px text), then #13-#19 (voice, icon-led screens, OTP login #17 with #40, low-bandwidth, accessibility), then #31-#37 for the pilot.

### Session 8, part 4
- **#41 finished except names:** the 24 skills nobody used (SQL, Node.js, TensorFlow, AutoCAD, Payroll Management ...) are attached to matching picker activities, so every taxonomy skill is now used somewhere and the picker covers 207 skills. Test threshold raised to 200.
- **#42 messages in the user's language:** the toast on web (`Toast.tsx`) and mobile (`Toast.tsx`, with `I18nProvider` now wrapping `ToastProvider` in `App.tsx`) translates any message it has a Hindi/Marathi version of. Added 19 translations: network error, "Something went wrong.", wrong password, login/session messages, consent and profile prompts, account exists, internship not found, access denied, and others. Backend messages not in the list still show in English.
- **#42 offline:** new web `OfflineBanner` (in the header) shows "You are offline. Check your internet connection." in en/hi/mr. Mobile shows the translated network error when a request fails (no new package added; a live banner would need `@react-native-community/netinfo`).
- **#42 scan:** every screen that calls the API has error handling. Web pages with no loading indicator: forgot-password, profile edit, profile-summary, skills. Not yet fixed.
- Totals: backend **150 passed**, web `tsc` clean + **16 vitest** + `next build` OK, mobile `tsc` clean + **13 jest**.
- **Not done:** device/browser walk-through, "Eligible" wording decision, native-speaker review of Hindi/Marathi (sessions 6-8), hi/mr names for new skills.

**Next:** add loading states to the four web pages, mobile live offline banner (needs netinfo), #42 per-screen checklist and 5-10 user test; then #13-#19 (voice, icon-led screens, OTP login #17 with #40, low-bandwidth, accessibility).


## 12. Session 9 (6 Nov 2026) - offline sandbox, small verified change
**Note:** the upload was named `InternSetu_session11.zip`, but this log ended at session 8 part 4, so this entry continues from there.
**Environment:** no network. FastAPI, pydantic, SQLAlchemy, bcrypt, pytest and all npm packages could NOT be installed, so only the pure-Python tests ran (stand-in runner, not in the repo): **59 pass**, 1 fails only because pydantic is missing (`test_pmis_handoff...`), 7 modules skipped (need fastapi/sqlalchemy/pytest). Web `tsc`/vitest/`next build` and mobile `tsc`/jest were **not run**. Run first next time: `cd backend && pytest`, `cd web && npm ci && npx tsc --noEmit && npx vitest run`, `cd mobile && npm ci --legacy-peer-deps && npx tsc --noEmit && npx jest`.

**Done**
- #21 (partly): cold-start picks (3+ skills missing) are now ordered same-state first, then fewest missing skills, then score. The final result sort uses the same key, so the order is kept. Close matches (1-2 missing) and eligible results are ordered exactly as before. New test `test_cold_start_picks_prefer_the_home_state`.
- Tracker note and header updated.

**Not done (needs a networked session)**
- Loading indicators on web forgot-password, profile edit, profile-summary and skills pages; mobile live offline banner (needs netinfo); #13-#19; #42 device walk-through; native-speaker review of Hindi/Marathi text.
- I did not edit web/mobile code this session because it could not be type-checked.

**Next:** run the three test commands above, then the loading states (#42), then #14/#15/#18/#19, #17 with #40, and #31-#37 for the pilot.

### Session 9, part 2 (still offline)
- Web loading states: forgot-password (button disabled, "Sending…"), profile edit ("Loading…" until the profile arrives, error text if it fails), profile-summary and skills ("Loading…" instead of a blank page). New strings "Sending…" and "Could not load your profile. Please try again." in `web/messages/en|hi|mr.json`; key parity and "every tr() string exists" were checked with a small script (OK). **`tsc`, vitest and `next build` were not run.**
- New file `TODO_FOR_YOU.md`: the steps that need network, devices, accounts or people (test commands, mobile offline banner, #13-#19, #17/#40, user tests, Hindi/Marathi review, open decisions).
- Not done on purpose: anything needing new packages (netinfo, expo-speech), SMS provider, translators or real users.

### Session 9, part 3 (still offline)
- Grouped skill picker (web + mobile) with search, category badges, remembered open/closed groups, and **Clear all**. New strings "Clear all", "Other skills" in en/hi/mr (web) and hi/mr (mobile).
- Password reset by email code. Backend: `app/core/otp.py` (stateless HMAC code, 5-10 min life, tied to the password hash so it is single use, wrong-guess lock, resend gap), `app/services/mailer.py` (SMTP or log-only dev mode), `forgot-password` / `reset-password` routes, `ResetPasswordRequest`, SMTP settings in config and `.env.example`. Web and mobile forgot-password screens are now two steps. 8 new strings in en/hi/mr. `tests/test_otp.py` passes (suite with stand-in runner: 64 pass, 1 env-only failure); `tests/test_auth.py` has 2 new API tests that need pytest + DB.
- `tools/i18n_tool.py` (status/export/import) and `docs/ADDING_A_LANGUAGE.md`; round-trip tested.
- `PROJECT_OVERVIEW.md` added.
- **Risks to check first next time:** web/mobile `tsc` (new components and screens), `pytest` (auth tests), alembic needs no migration (no new tables).

### Session 9, part 4 (still offline): #18 low-bandwidth, first slice
- **Saved results when offline:** after each successful load, the last recommendations are stored on the device (web `localStorage` via `web/app/lib/offlineCache.ts`; mobile `AsyncStorage` key `internsetu_recs_cache`). If the server cannot be reached (`ApiError` code `network`), the saved copy for the same language/filter is shown with the banner "You are offline. Showing results saved on this device." and the save time. The copy is deleted at logout / 401 (`clearToken`) because it holds profile-based results. New string in en/hi/mr (web) and hi/mr (mobile).
- **Installable web app:** `web/public/manifest.webmanifest`, `icon-192.png`, `icon-512.png`, theme colour; linked in `app/layout.tsx` (middleware already skips dotted paths).
- Not built: service worker (pages themselves still need a connection to open), request retry, image/size audit.
- Unverified: `tsc`/vitest/jest/`next build`.

### Session 9, part 5 (still offline): #19 accessibility, code-level pass
Found by reading the code and computing WCAG contrast (no devices or axe available):
- **Web contrast:** light-theme `--faint` 3.0:1 -> 5.5:1, `--danger` 3.7:1 -> 5.5:1, `--muted` 4.4:1 on cream -> 5.3:1 (all >= 4.5:1). Dark theme: `--teal` text on the dark card is 3.9:1 (below 4.5:1) and was NOT changed because the same colour is the button fill; needs a design decision.
- **Web:** `<html lang>` now follows the chosen language (`HtmlLang` component) so screen readers use the right voice; error toasts use `role="alert"`; tap targets: ghost buttons 44px, "show more" 44px, selected-tags 36px.
- **Mobile:** `accessibilityRole`/state added to Choice (checkbox + checked), Header, JobCard (buttons/link), LanguageSwitcher (selected), Field (label for the text box, show/hide button); card buttons now at least 44pt.
- **Not done (needs a real device):** TalkBack/VoiceOver walk-through, axe/Lighthouse run, focus order check, text-zoom 200% check, skip-to-content link.
- Unverified: `tsc`, vitest, jest, `next build`.

### Session 9, part 6 (still offline): retry + Bengali started
- **Retry on weak network:** GET requests (web `lib/api.ts`, mobile `api.ts`) are retried twice (1.2 s, 2.4 s waits) on network failure/timeout; POST/PATCH/DELETE are never retried. Worst case on mobile about 60 s before the error/offline copy appears.
- **Languages widened on the server:** new `app/core/languages.py` (en, hi, mr, bn, te, ta, gu). Register, settings and `?lang=` accept them; server sentences fall back to English where no translation exists. Tests: `tests/test_languages.py` (passes), `test_untranslated_language_falls_back_to_english` (needs pytest + DB).
- **Bengali (bn) on the web:** added to routing and the language switcher; `web/messages/bn.json` = English copy with **156 of 500 strings in Bengali** (login/register/consent/forgot-password/profile steps/skills/preferences/results/saved/header). Remaining 344 strings (account, edit profile, profile summary, PMIS check, home/browse, match modal, privacy text, admin) still show English. PMIS pre-check and activity tile text use English for bn (`L3_LANG`). i18n test extended for bn.
- **Not done for bn:** mobile app (needs `bn` in `i18n.tsx` Lang type + `bnExtra`), backend reason sentences, activity labels, PMIS questions, email text, native-speaker review (limitation for the report).
- Unverified: `tsc`, vitest, jest, `next build`, pytest.


## 13. Session 10 (6 Nov 2026) - networked sandbox: Bengali finished, everything run
**Tests (all run this session):** backend **159 passed**; web `tsc` clean + **17 vitest** + `next build` OK; mobile `tsc` clean + **13 jest**. This also clears the "unverified" notes from session 9 (loading states, grouped picker, offline cache, accessibility, retry, Bengali start).

**Done: #13 Bengali (bn) end to end**
- **Web:** the remaining 344 strings translated; `bn.json` is 500/500 (`i18n_tool.py status`). `L3_LANG` now returns `bn`.
- **Backend:** Bengali for all 17 reason codes (`reasons.py`), the 32 explanation/message patterns (`localize.py`), PMIS pre-check and its notice, the apply-documents list and note, 61 activity names (map rebuilt), and the reset-code email. Unknown languages (te/ta/gu) still fall back to English.
- **Mobile:** Bengali added to the language switcher (বাংলা) with a 300-string dictionary (`bnExtra`; 285 reused from the web, 15 new); `bn` accepted as a saved language and by `register` / `updateSettings`; new `pick()` helper so PMIS and activity text falls back to English when a translation is missing.
- **Bug fixed:** `test_password_reset_with_emailed_code` (written in session 9, never run) could not read the code because a full stop follows it in the email; the test now uses a regex. The reset flow itself was fine.
- **Test updated:** the "untranslated language falls back to English" test now uses `te`, and also checks that `bn` is translated.

**Not done / limits**
- All Bengali is machine-translated and has **not** been reviewed by a native speaker (say so in the report). Check button widths on small phones and that a Bengali font renders on the test devices.
- te / ta / gu not started; mobile PMIS question text relies on the same dictionary (translated).
- Device/browser walk-through still not done. Items needing you: see `TODO_FOR_YOU.md`.


## 14. Session 11 (6 Nov 2026) - email-code login and deletion (decision: no SMS)
**Decision (you):** SMS costs money, so #17/#40 use **email codes**.
**Tests (all run):** backend **162 passed** (+3); web `tsc` + 17 vitest + `next build` OK (new route `/login-code`); mobile `tsc` + 13 jest.
- **Backend:** `POST /auth/login-code` (email a code), `POST /auth/login-code/verify` (returns the normal token); `POST /me/delete-code`; `DELETE /me` now accepts `{password}` or `{code}`. Codes reuse `core/otp.py` (HMAC, no DB table), now also single-use via `used_codes`. Email text in en/hi/mr/bn (`mailer.kind_code_email`).
- **Web:** `/login-code` page, link on the login page, "Email me a code instead" on the delete-account box; 6 new strings in en/hi/mr/bn.
- **Mobile:** `LoginCodeScreen`, link on Login, code option on Account; same 6 strings.
- **Not done:** registration still requires a password; the code limiter and used-code list are in memory (one server; move to Redis/DB before running several servers, tracker #32). Real delivery needs SMTP keys.

## 15. Session 12 (6 Nov 2026) - four tasks that needed no input from you
**Tests (all run):** backend **163 passed** (+1); web `tsc` + 17 Vitest + `next build`; mobile `tsc` + 13 Jest. Nothing was tried on a real phone or browser.
- **Mobile offline banner (#42):** installed `@react-native-community/netinfo`; `OfflineBanner` shows a warning bar on every screen when the phone has no internet; 1 new string in en/hi/mr/bn.
- **Read aloud (#14, part):** `expo-speech` installed; "Read aloud / Stop reading" button on every recommendation card (title, company, place and the "why" sentences). Web uses the browser's speech (hidden if unsupported). Voice language follows the app language (en-IN, hi-IN, mr-IN, bn-IN); depends on voices installed on the device.
- **Register without a password (#17 finish):** `password` is optional when an email is given; the server stores a random unusable hash, so only the emailed-code login (or password reset) works for that account. Web and mobile forms say "Optional. Leave blank to log in with an emailed code." Mobile-number-only registration still needs a password and an email is required without one.
- **Service worker (#18, part):** `web/public/sw.js` caches only `/_next/static`, icons, logo and hero image; never API calls or pages. Registered only in production. Bump `VERSION` in `sw.js` to reset caches.
- **Not done / needs you:** device walk-through, Lighthouse/TalkBack, native-speaker review (hi/mr/bn), SMTP keys, te/ta/gu (large translation job), icon-led screens (#15, design decisions), voice input, read-aloud on other screens.

## 16. Session 13 (7 Nov 2026) - illustrated, icon-led screens (#15)
**Your decisions used:** all screens; few questions per screen with big tiles (responsive); illustrations; text always shown with icons; read-aloud only when tapped; users 18-25 with little English.
**Tests (all run):** web `tsc` + 17 Vitest + `next build`; mobile `tsc` + 13 Jest. Backend untouched (163 passed in session 12). I viewed the six illustrations as images; I could not open the app in a browser or phone here, so layouts are untested visually.
- **Art:** six flat illustrations written as SVG strings in `web/app/lib/illustrations.ts` and `mobile/src/illustrations.ts` (same content): welcome, education, skills, location, sector, results. Web shows them with `Illustration`, mobile with `react-native-svg` (`SvgXml`). They are decorative (hidden from screen readers).
- **Step header:** web `StepHero`, mobile `SetupLayout` `art` prop: picture + eyebrow + question + help text + **Read aloud** button. Used on education, skills and preferences steps. Wide screens: picture left, text right; phones: stacked and centred.
- **Tiles:** education level and "how far are you willing to go" are now big icon tiles with labels (radio behaviour, keyboard focus ring, reduced-motion respected). Skills, cities and domains stay as chips/groups because the lists are long.
- **Other screens:** welcome art on login (web + mobile), results art on recommendations, sector art above the domain picker.
- **Not done:** art on register, forgot-password, code-login, account and pmis-check screens; one-question-per-screen wizard (you chose few questions per screen, so not needed); real-user comprehension test (#16).

## 17. Session 14 (7 Nov 2026) - sign-up with emailed code, voice everywhere, remaining illustrations
**Your decisions:** email + password + OTP mandatory at sign-up; login with password; forgot password -> OTP on email; illustrations on register / forgot-password / account; voice input and read-aloud on every screen; no new languages.
**Tests (all run):** backend **162 passed**; web `tsc` + 17 Vitest + `next build`; mobile `tsc` + 13 Jest. Speech features were not tried on real devices.
- **Backend:** `POST /auth/register-code` (emails a code bound to that email; refuses existing emails; 1/min), `POST /auth/register` now requires email, password and `code` (single use, 5 wrong tries lock 15 min, a code works only for its own email). Passwordless login endpoints removed (they were added in session 11). `mailer` has a "signup" email in en/hi/mr/bn. Tests: conftest `register()` adds a valid code; an autouse fixture clears OTP state between tests; 2 new tests; 4 passwordless tests removed.
- **Web:** register page is two-step (details -> "Send verification code" -> enter code -> "Create account"); `/login-code` page and its link removed; `ReadPage` floating "Read this page" on every screen (reads the main text, only on tap); `MicButton` (browser speech recognition, hidden if unsupported) next to skill/domain/city searches and "Other" boxes; illustrations on register, forgot-password, account.
- **Mobile:** same register flow; `LoginCodeScreen` removed; `useSpeakable(text)` per screen + `ReadScreenButton` in Header and AuthLayout; `MicButton` (`expo-speech-recognition`, guarded so Expo Go just hides it) in `Field voice`, pickers and the Discover search; illustrations on register, forgot-password, account.
- **Important consequence:** with sign-up requiring an email code, **a public deployment without working SMTP means nobody can register.** Locally, the code is printed in the server log.
- **Not done:** voice input on every single field (done for search/typing boxes, not for passwords/codes on purpose); art on consent / pmis-check / profile-summary; other languages (as requested).

## 18. Session 15 (7 Nov 2026) - illustrations only: 3D look and animation
**Only the illustrations changed** (no behaviour, text or backend changes). Web `tsc` + 17 Vitest + `next build` and mobile `tsc` + 13 Jest pass; I viewed all 9 scenes as images; animations could not be watched in a browser/phone here.
- **Style:** all 9 scenes (welcome, education, skills, location, sector, results, signup, lock, account) redrawn in a soft "clay 3D" style: gradients, gloss highlights, extruded cards, ground shadows, characters with ears, blush, brows and collar. Palette = InternSetu teal + cream, complemented by warm amber, coral and navy. The backdrop is a translucent teal glow so it suits light and dark mode.
- **Web animation:** `ART_ANIM` (CSS animation inside the SVG): floating, twinkling stars, blinking eyes, waving arm, spinning gear, bouncing map pin with shadow, moving route dashes, filling progress ring and bar, envelope sliding in, check pop, shackle lifting on the padlock, swinging key/tassel/wrench, drifting cloud, falling confetti. Stops for people who prefer reduced motion.
- **Mobile:** static `ART` (gradients only, because the SVG library ignores CSS animation) with a soft floating motion from React Native `Animated`; also skipped when the phone's reduce-motion is on.
- **Files:** `web/app/lib/illustrations.ts` and `mobile/src/illustrations.ts` (same content, generated), `web/app/components/Illustration.tsx`, `mobile/src/components/Illustration.tsx`.

## 19. Session 16 (7 Nov 2026) - illustration fixes
- **Bug fixed:** every character had one centred leg. Now two legs with shoes.
- **Female character added** (long hair, side fringe, gold earrings, amber dupatta over the shoulder). Welcome, education and sign-up scenes show her; skills, results and account show the male character. Both appear across the app.
- Regenerated `illustrations.ts` (web + mobile). Web tsc/17 tests/build and mobile tsc/13 tests pass; stills checked as images, animation not watched on a device.

## 20. Session 17 (7 Nov 2026) - illustrations v3 (object-only) and typography
**Tests (all run):** web `tsc` + 17 Vitest + `next build`; mobile `tsc` + 13 Jest. Backend untouched (162 passed on your machine).
- **Illustrations:** people removed (proportions did not look good). Scenes are now object-only, centred and symmetrical: welcome (phone over a **bridge**, a nod to "Setu"), education (graduation cap, books, certificate, medal), skills (meshing gears, code window, wrench), location (map + pin), industries (factory, shop, tower), results (score card + magnifier), sign-up (form card + envelope), password (padlock + key + envelope), account (profile card + shield). Same palette, 3D gradients, soft shadows; web animation, mobile floating motion. Free option "E" (made in-house), so no licence questions.
- **Typography:** Plus Jakarta Sans (English) + Noto Sans Devanagari (Hindi, Marathi) + Noto Sans Bengali (Bengali). **Bug found:** the web app never loaded DM Sans / Manrope (the CSS used font variables that nothing defined), so browsers showed their default font. Fixed by bundling the fonts with the app (`@fontsource` packages: no Google requests, works offline, cached by the service worker). Mobile: new `@expo-google-fonts` packages; the font family now follows the app language (`setFontScript` in `theme.ts`, called by the language provider); old DM Sans / Manrope packages removed.
- **You must run** `npm install` in `web` and `mobile` (new packages) after unzipping.

## 21. Session 18 (7 Nov 2026) - 12-week report and Jira/Git setup
- **Report** (`docs/project-management/InternSetu_12_Week_Progress_Report.docx`): dates added (24 Aug to 4 Nov 2026, weeks 1-11 six days each, week 12 seven days), reporting period on the cover, Jira links now `SCRUM-1..48` at the real Atlassian site, GitHub links point at Harshita-Kashyap/InternSetu, task owners re-assigned to the roles (Ishika engine, Jiya web, Krishna docs and testing, Harshita backend and mobile).
- **Jira:** `jira_import_SCRUM.csv` (48 tasks, week/sprint/owner labels, due dates).
- **Git:** `.github/workflows/ci.yml` added (pytest, web tsc/vitest/build, mobile tsc/jest). **Finding:** the real repo has only `main` and `master` and no pull requests, while the report names `develop`, feature branches and PRs #1-#14; see `JIRA_AND_GIT_SETUP.md` for the two honest options.

## 22. Session 27 (8 Nov 2026) - analysis of the whole app, then fixes
**Analysis:** all suites passed on the uploaded zip (backend 162, web 17 + build, mobile 13). Findings: no admin audit log although the methodology paper said every weight change is logged; the `app_settings` table (scoring weights) had no migration; Render and Docker started without running migrations; the tracker was stale (account settings screen already existed).
- **Admin audit log:** table `admin_audit_log` (who, action, target, JSON details, time) written after every successful admin change (weights update/reset, taxonomy create/update, flagged value resolve, CSV import that is not a dry run, internship on/off); `GET /api/v1/admin/audit?limit=&offset=&action=` for admins only. The log holds no candidate data. Admin email is stored in the row so it stays readable if the account is deleted.
- **Migration bug fixed:** 0006 creates `app_settings`. New test `tests/test_migrations.py` runs `alembic upgrade head` on an empty database and checks that every model table and column exists. Backend tests: 162 -> 165 (all passed, plus web 17 + build, mobile 13).
- **Start-up:** `render.yaml` and `Dockerfile` run `alembic upgrade head` before uvicorn. If a database was created earlier with `create_all` (not alembic), run `alembic stamp head` once instead, or use an empty Neon database.
- **Not done on purpose:** per-IP rate limiting. Behind Render's proxy every visitor can look like the same IP unless the proxy is configured as trusted, so a naive limit could lock out all users. The per-email limits stay.
- **Cleaned:** an unused message saying consent withdrawal "will be added" was removed from the 4 message files.

## 23. Session 28 (8 Nov 2026) - tests and coverage for backend, web and mobile
**Result (all run):** backend **194 tests** (165 + 29), web **48 tests** (17 + 31), mobile **42 tests** (13 + 29). All pass.
**Coverage:**
- **Backend 89%** of application code (2,966 statements, 319 missed). `backend/.coveragerc` leaves out the one-off command-line tools in `app/scripts` (dataset builders, admin creation, smoke test) and `app/engine/api.py` (the teammate's standalone demo server, unused by the app). Counting those too it is about 74%. Weakest remaining modules: `engine/data_loading.py` 45%, `engine/profile.py` 51%, `engine/semantic/scorers.py` 57% (the optional embedding stage), `main.py` 57%.
- **Web 61% statements, 77% branches** for `app/lib` and `app/components` (pages are not measured; they are covered by manual steps in `USER_STEPS.md`).
- **Mobile 60% statements, 47% branches** for `src` excluding screens.
- Thresholds that fail the build if coverage drops: backend 80% (CI), web 55/70/40/55 (`vitest.config.ts`), mobile 55/40/55 (`package.json`).
**New tests:** backend: mailer (log mode, SMTP success and failure, all code emails in 4 languages), validators, admin ping/stats/lists/roles, root and health, migration check. Web: API client (token, errors, 401, retry), offline cache, local and server profile mapping, taxonomy lookup, illustrations, StepHero, read-aloud, read-page, microphone, offline banner, chip picker, theme toggle, language tag, service worker registration, toast. Mobile: API client, font family per language, illustrations, button, read-aloud, screen read-aloud store, offline banner, microphone fallback, grouped skill picker, toast, language provider, profile mapping and taxonomy lookup.
**Fixed along the way:** "Read this page" now falls back to `textContent` when `innerText` is unavailable. Removed `app/api/routes/users.py`: dead code, never mounted, and it failed to import (it referenced a `UserCreate` class that does not exist); if it had ever been mounted it would have created accounts without a password check, consent or email code.
**CI:** `.github/workflows/ci.yml` now runs coverage for all three (backend `--cov-fail-under=80`) and uploads the coverage files.
**Not covered:** end-to-end browser tests (no browser here), screen files on mobile, Next.js pages, real SMTP delivery.

## 24. Session 29 (8 Nov 2026) - audit-log screen, sliding sessions, error logging
**Tests (all run):** backend **199** passed, web **56** passed (63% statements, 78% branches) + `tsc`, mobile **46** passed (61%) + `tsc`.
- **Audit-log screen (web admin):** new **Audit log** tab: time, admin email, what changed, target, short details (for weights only the numbers that moved, e.g. `skills 35 -> 40`). 50 rows per page with "Load more". Read only. Text in en/hi/mr/bn. Logic in `web/app/lib/audit.ts` (tested).
- **Sliding sessions:** backend `POST /auth/refresh` swaps a still-valid token for a new 60-minute one and keeps the original session start (`ss` claim); after `SESSION_MAX_DAYS` (14) it answers 401 `session_too_old` and the person logs in again; expired or invalid tokens are refused. Web and mobile check the token's expiry before each signed-in request and renew when under 20 minutes remain: one renewal at a time, and if it fails the real request carries on and reports its own result. Tests cover timing, sharing one renewal, failure, expired tokens and the 14-day cap.
- **Error logging:** `core/request_log.py` middleware: request ID on every response (`X-Request-ID`, exposed to browsers), one line per request (method, path, status, ms), health checks at DEBUG, 5xx at WARNING. Crashes are logged with the traceback and answered with a JSON 500 that quotes the ID (the CORS wrapper still adds its headers). A test checks that no password, query string or email reaches the logs.
- **New settings:** `SESSION_MAX_DAYS`, `LOG_LEVEL` (in `.env.example`).
- **Not done:** an external monitoring service (for example Sentry or uptime checks); per-address rate limits; audit-log filters or export.

## 25. Session 30 (8 Nov 2026) - skill umbrella cards and a consistent design system
**Tests (all run):** web **60** passed (+4), mobile **50** passed (+4), both `tsc` clean, web `next build` OK. Backend unchanged (199).
- **Skills as umbrella cards (web + mobile):** each of the 32 categories is a rectangle: icon, name, "n skills", and a `chosen/total` badge once something is picked; the related skills are chips inside. Long categories show 8 skills plus "Show all (+n)"; a chosen skill never hides. Selected tray on top (sticky on the web) with Clear all. Search (and voice) opens every matching card and also matches category names. Practical categories first (everyday, office, communication, customer service, soft skills, languages...), technical ones later. Skills with no category go into "Other skills". Same data and same saved values as before, so nothing changes in the backend. Icons and order: `skillIcons.ts` (web `app/lib`, mobile `src`).
- **Design-system layer:** `DESIGN_SYSTEM.md` (principles, colour, type, shape, components, layout, motion, checklist). Web: tokens `--r-sm/md/lg`, `--tap`, `--shadow-1/2`, `--ring` and a final CSS block that unifies buttons (46 px, radius 12, bold), text boxes (46 px, radius 12, 1.5 px border, 16 px on phones so iOS does not zoom), cards (radius 16, soft shadow), chips (one look), choice tiles, headings (one scale) and the focus ring. Mobile: `radius` and `tap` tokens in `theme.ts`; radii 10/14/20 folded into 12/16 across 17 files; borders on Field, Choice and Button 1.5.
- **Look:** an approximate preview of the picker was rendered with WeasyPrint (it only approximates CSS grid), so the real browser layout has not been seen.
- **Not done:** a page-by-page visual review on real devices; replacing the older chip pickers for cities and industries with a different layout (they now share the same chip look); dark-mode check on a device.
