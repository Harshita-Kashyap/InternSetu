# InternSetu explained in simple words

The whole project in plain language: what it is, who it is for, how it works, what is good, what is not, and what is left.

---

## 1. The one-minute version

**InternSetu** is an app and website that helps young people in India find internships they can actually get.

The government runs the **PM Internship Scheme (PMIS)**, and its portal lists many internships. Choosing among them is hard, especially for someone from a village school, with little English, who doesn't know which listings they qualify for. InternSetu is a **guide in front of the portal**:

1. You tell it about yourself: education, skills, where you want to work, and what field you like.
2. It checks every internship and picks the **best 3 to 5 for you**.
3. For each one it explains **why**, in your language, in short sentences.
4. When you are ready, it sends you to the **official PMIS portal** to apply. InternSetu never applies for you and is not a government service.

The name means "Internship Bridge" (*setu* = bridge).

---

## 2. Who, why, when, where

| Question | Answer |
|---|---|
| **Who is it for?** | Mainly people aged 18-25 with limited English, limited internet, often the first in their family to study further. Graduates and postgraduates can use it too. |
| **Why does it exist?** | To make internship choices easier to find and understand, and fair for people from small towns and remote districts. |
| **Who built it?** | You, as your B.Tech major project at SVIIT Indore, with Claude doing most of the architecture and code under your direction. |
| **When?** | Over about 17 working sessions in 2026; the latest is 7 November 2026. |
| **Where does it run?** | A website (laptop and phone, installable like an app) and an Android/iOS app made with Expo. A server (the "backend") does the thinking and keeps the data. |
| **What it is NOT** | Not the government portal, not a job guarantee, not a prediction of selection. A match score shows how well your profile fits a listing. The 2,500 listings are **demo data**, not the real PMIS list. |

---

## 3. What a person does, step by step

1. **Sign up.** Name, email, password. The app emails a 6-digit code to prove the email is yours; type it and the account is created.
2. **Accept the privacy notice** (what data is used and why, in the local language).
3. **Fill the profile in 3 short steps** with pictures and big tiles: education; skills (pick, type or speak); preferences (where, what kind of work, which industries).
4. **See matches.** Each card shows company, place, stipend, a match percentage and a **"Why recommended"** list. Save it or have it read aloud.
5. **Check PMIS eligibility** with a short quiz (age, family income, government job in the family...). Nothing is saved.
6. **Apply on the official portal.** InternSetu gives a document checklist, then opens the real PMIS site.
7. **Look after your data.** From the Account page: download everything stored, withdraw consent, or delete the account (confirmed by password or an emailed code).

If you forget your password: request a code on your email and set a new one.

### What happens when a user withdraws consent?

Consent is the person's recorded permission to use their data for recommendations. Withdrawing is a button on the Account page.
- **At once:** that consent record is marked withdrawn (with the time). From then on the server refuses to show recommendations or change the profile, and the app sends the person back to the privacy notice. Nothing that uses their data is shown.
- **What does NOT change:** the profile, skills and saved internships stay in the database. Withdrawing is "pause", not "erase". The person can accept again later and continue where they stopped, and can still download their data.
- **To erase everything:** use **Delete my account** (password or emailed code). It removes the profile, skills, saved internships and consent records.
- **Honest note for the report:** some privacy rules expect withdrawal to also stop storage or lead to deletion within a set time. Today deletion is the person's own action. A future improvement is an automatic "delete after N months without consent" rule.

---

## 4. How the "brain" works (the matching engine)

Think of a careful clerk with a checklist who goes through every internship.

**Step 1: Can you even apply? (eligibility).** You are *eligible* only if your **education level is high enough** and you have **all the mandatory skills** (at most 2 per listing). This is a rule, not a score.

**Step 2: How well do you fit? (scoring).**

| Part | Weight | In simple words |
|---|---|---|
| Skills | 35% | How many wanted skills you have |
| Interest / industry | 25% | Is it in a field you like |
| Education | 20% | Does your study level and field fit |
| Location | 20% | Is it near you or where you said you would go |

**Step 3: Tiers, so nobody gets an empty page.** *Eligible* (you meet the rules), *Close match* (education fine, 1-2 skills missing, and it tells you which to learn), *Starter* (beginner-friendly picks when a profile is thin). You always get 3 to 5 results.

**Step 4: Explain it.** Reasons come from fixed templates ("You have 2 of the 3 wanted skills: Excel, SQL"). Templates cannot make things up and translate cleanly into Hindi, Marathi and Bengali.

---

## 5. The parts

| Part | What it is | Built with |
|---|---|---|
| Website | Opens in a browser; installable | Next.js (PWA) |
| Mobile app | Android / iOS | Expo / React Native |
| Backend | The brain and the keeper of data; the API | FastAPI (Python) |
| Database | Users, profiles, internships, consent | PostgreSQL (SQLite for local tests) |
| Data | 2,500 demo internships, 700 made-up candidate profiles for testing | CSV files loaded by scripts |
| Email | Sends the 6-digit codes | Any SMTP service (Gmail, Brevo...) |
| Fonts and pictures | Plus Jakarta Sans + Noto Sans (Devanagari, Bengali); 3D-style SVG illustrations | Bundled in the apps |

Website and app are two "faces" on one backend, talking through one JSON API.

---

## 6. Feature list

- Email sign-up with verification code; password login; password reset by emailed code
- Privacy consent in local language; withdraw consent; download my data; delete my account
- 3-step profile with icon tiles, illustrations and a skills picker made of **umbrella cards** (a rectangle per category such as "Office Productivity" holding its related skills)
- Recommendation engine with tiers and plain-language reasons
- **English, Hindi, Marathi, Bengali** across website, app and server messages
- PMIS eligibility pre-check and document checklist
- Voice: **read this page / read aloud** (only when tapped) and a **microphone** for search and typing boxes
- Low-data help: results saved offline, retry on weak networks, offline banner (mobile), installable web app with a static-file service worker
- Accessibility work: contrast, labels, tap sizes, page language, reduced-motion respect
- Admin console: add or import internships (CSV), tune score weights, manage lists, review unknown values students typed; every admin change is written to an **audit log** (who, what, when) that admins can read in an **Audit log** tab
- Dark mode, language switcher

---

## 7. Strengths

1. **Fair by design:** rules decide eligibility, scores only rank, and there is always a close-match or starter path.
2. **Explainable:** every result says why.
3. **Built for the real user:** local languages, plain words, pictures, voice, low-data tricks.
4. **Privacy-minded:** consent, data download, deletion, no applying on your behalf.
5. **Tested:** 199 backend, 60 web, 50 mobile automated tests, plus a data audit and fairness/sensitivity checks on 700 test profiles.
6. **Honest about limits:** says it is guidance only and points to the official portal.
7. **One backend, two apps:** less duplicate work, consistent behaviour.

---

## 8. Limitations (say these in the report)

1. **Demo data:** internships are synthetic, not the live PMIS list.
2. **Translations:** Hindi, Marathi and Bengali are machine-translated; only Hindi was checked by a native speaker.
3. **Not a prediction:** a 70% match is not a 70% chance of selection.
4. **Thin profiles struggle:** people who list almost no skills got an eligible internship only 5% of the time (they get close-match or starter results).
5. **Small gaps remain:** remote districts and low-English users have slightly fewer eligible results (about 6-8 points lower).
6. **Email dependency:** sign-up needs working email (SMTP); without it nobody can register on a public site.
7. **One server only:** the code limiter lives in memory. Sessions renew while a person is active (up to 14 days), and every request is logged with an ID, without personal data.
8. **Voice depends on the device:** needs installed voices; phone microphone input needs a development build.
9. **Not yet tested on real users or devices:** Lighthouse, TalkBack and user tests are still to do.
10. **Withdrawing consent keeps data** until the person deletes the account (see section 3).
11. **Languages left out:** Telugu, Tamil, Gujarati, tribal languages.

---

## 9. How it was tested

- **Automated tests:** 199 backend (engine, API, codes, privacy), 60 web, 50 mobile.
- **Dataset audit:** every candidate type gets at least 3 results; 89.6% get at least one eligible internship.
- **Fairness check:** results compared across remote district, first generation, low English and education level.
- **Sensitivity check:** removing the skills weight changes the top pick for about half of candidates, so skills matter most; the "role" weight is 0, so it has no effect.

---

## 10. What is left

- Run it on a real phone and browser; fix what looks wrong (see `USER_STEPS.md`)
- Set up email sending
- Lighthouse and TalkBack audits; test with 2-3 real users
- Native-speaker review of Hindi, Marathi, Bengali
- Optional later: more languages, real PMIS data, deployment

---

## 11. Words for your presentation

> "InternSetu is a multilingual guide that turns a student's profile into a short list of internships they qualify for, explains each choice in simple words, and hands them to the official portal to apply. It is fair, explainable and private by design."

**Key terms:** PMIS = PM Internship Scheme · Eligible / close match / starter = the three result tiers · Consent = recorded permission to use data · Code = the 6-digit one-time code sent to email · PWA = a website installable like an app · API = the messenger between apps and server
