# Adding a language (example: Bengali, `bn`, finished in session 10)

**Status:** Bengali (`bn`) is complete on web, mobile and backend (machine-translated, unreviewed); it is the worked example for te/ta/gu. Server codes bn/te/ta/gu are already accepted (`backend/app/core/languages.py`) and fall back to English.

Chosen next languages (by number of speakers and how well AI models translate them): **Bengali (bn), Telugu (te), Tamil (ta)**, optional **Gujarati (gu)**.
Hindi is the only language a native speaker has checked. All others must be listed in the final report as a limitation:
*"Machine-translated, not reviewed by native speakers."*

## What has to be translated (in this order of importance)
1. **Web screens**: `web/messages/<lang>.json` (about 290 user-facing strings; the rest are admin screens).
2. **Mobile screens**: add a `<lang>Extra` object in `mobile/src/i18n_extra.ts` and register it in `mobile/src/i18n.tsx`.
3. **Backend sentences**: `backend/app/engine/explanation/reasons.py` (one entry per reason code), `backend/data/pmis_rules.json` + `services/pmis_rules.py` (PMIS questions), `scripts/build_activity_map.py` (activity names, then re-run it), `services/mailer.py` (email text).
4. Allow the code in: `web/i18n/routing.ts`, `web/app/components/LanguageSwitcher.tsx` (the backend already accepts it via `core/languages.py`); add the language's own entries to `reasons.py` once its sentences are written.

## Step by step for step 1 (no coding)
```
python tools/i18n_tool.py export bn > bn_todo.csv      # missing strings
```
Give the CSV to an AI model with this prompt, in batches of ~100 rows:
> Translate the `english` column into Bengali for first-time job seekers aged 18-25 with limited English, 6th-grade reading level, simple everyday words, polite "you" form. Keep placeholders like {name} and numbers unchanged. Keep "InternSetu", "PMIS", "Aadhaar" in English. Return the same CSV with the `translation` column filled.
```
python tools/i18n_tool.py import bn bn_translated.csv
python tools/i18n_tool.py status
```
Then open the app in that language and look for text that overflows buttons (Indic scripts are wider than English).

## Testing
`cd web && npx vitest run` (the i18n test checks that every string has a key). Ask any Bengali speaker you know to skim 20 screens: even an informal look is worth more than none.

## Bengali checklist (what session 10 changed: copy it for te/ta/gu)
- Web: `web/messages/bn.json` (all 500), `L3_LANG` in `web/app/lib/api.ts`.
- Mobile: `bnExtra` in `mobile/src/i18n_extra.ts` (same English keys as `mrExtra`; strings that exist on the web were reused), `Lang`/`LANGS`/`dicts`/saved-language check in `mobile/src/i18n.tsx`, `pick()` helper in `mobile/src/api.ts`.
- Backend: `reasons.py` (one entry per code + `LANGS`), `services/localize.py` (`_BN` list, same order as `_R`; an assert checks the length), `services/pmis_rules.py` (`_BN`), `api/routes/pmis.py` (`_DOC_BN`, note), `scripts/build_activity_map.py` (`BN` list, then re-run it), `services/mailer.py`.
- Tests: `test_untranslated_language_falls_back_to_english` uses `te`; change it when te gets text.
