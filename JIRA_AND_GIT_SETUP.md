# Jira and Git setup for the 12-week report

Repo: https://github.com/Harshita-Kashyap/InternSetu  
Jira: https://harshitakp123-1789300296067.atlassian.net (project key **SCRUM**, board 1)

Files: `docs/project-management/InternSetu_12_Week_Progress_Report.docx` (dates 24 Aug to 4 Nov 2026, SCRUM-1..48 links, owners) and `jira_import_SCRUM.csv`.

## Team roles used for the owners in the report and in Jira
- **Ishika:** recommendation engine (eligibility, scoring, ranking, explanations, domain model, engine diagrams)
- **Jiya:** web frontend (Next.js screens, UI-to-API connection, component diagram, reviews)
- **Krishna:** documentation and testing (use cases, activity/package diagrams, PyTest, integration tests, README)
- **Harshita:** backend integration and mobile app (database, migrations, API, CI workflow, Expo screens, deployment)

Week dates: weeks 1-11 are 6 days each starting Mon 24 Aug 2026; week 12 runs 29 Oct to 4 Nov 2026.

## A. Jira (about 10 minutes)
1. In your SCRUM project open **Project settings > Import work items** (or Jira settings > System > External system import > CSV).
2. Upload `jira_import_SCRUM.csv`. Map: Summary, Issue Type, Status, Labels (all three Labels columns), Description, Due date.
3. For the date format choose `dd/MMM/yy` (example 29/Aug/26).
4. If "Done" is refused as a status, import as To Do, then select all and bulk-move to Done.
5. **Check the numbers:** the first imported ticket must be **SCRUM-1** and the last **SCRUM-48**. If your board already had tickets, the numbers shift. Tell me the first number you see and I will re-number every link in the report.
6. Jira stamps the real import date as "created". That is honest; the planned dates live in Due date and in the report.

## B. Git: the report must match the repo
I checked the repo on 7 Nov 2026. It has only **`main`** and **`master`**, and **no pull requests**. The report names a `develop` branch, feature branches and PRs #1 to #14. **Those do not exist yet, so their links lead to 404 pages.** A guide can check this. Choose one:
- **Option 1 (recommended, honest):** run `git branch -a` and `git log --oneline` and send me the output. I rewrite the Git tables to match what really exists (for example "main, 41 commits, CI added") and keep the PR column "-" where there is none.
- **Option 2 (from today):** work the way the report describes from now on: create `develop`, make a branch per ticket (`feature/...`), open real pull requests, get one teammate to review, merge. Then the next weeks' reports can cite real PRs. Do not backdate anything.

## C. Clean-up and CI (about 15 minutes)
1. Two default-looking branches exist (`main` and `master`). Keep `main`: GitHub > Settings > Branches > default branch = main, then delete `master`.
2. Create `develop`: `git checkout main && git checkout -b develop && git push -u origin develop`.
3. Copy `.github/workflows/ci.yml` (already in this project) into the repo and push. On GitHub the **Actions** tab shows a green or red build for backend tests (pytest), web (types, tests, build) and mobile (types, tests). The Week 9 claim becomes true from the day you push it.
4. Settings > Branches > add a rule for `main`: require a pull request and require the CI checks to pass.
5. Commit messages should name the ticket, for example `SCRUM-30 add scoring engine`. The rubric checks this.

## D. For the guide meeting
Open the Jira board, the Actions tab, the PR list and the report side by side. Everything shown should exist when you open it.
