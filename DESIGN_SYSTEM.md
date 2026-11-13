# InternSetu design system

One set of rules for the website and the mobile app, so every screen looks and behaves the same. When you build or change a screen, follow this page. Last updated: session 30.

## 1. Principles
1. **Words and pictures together.** Icons and illustrations always come with a short text label. Nothing depends on colour or pictures alone.
2. **Tap what you know.** Choices are visible tiles and chips, not hidden menus. Long lists are grouped under a clear heading ("umbrella" cards).
3. **Plain, short text.** About Grade 6 reading level. One idea per sentence. Text can be read aloud (only when tapped) and many boxes accept speech.
4. **Big targets, low effort.** Minimum tap height 46 px on the web and 48 on the phone. Forms ask only what the engine needs.
5. **Same everywhere.** Same radius, border, height, colour for the same job. No one-off styles.
6. **Works for everyone.** Contrast at least 4.5:1, a visible focus ring, labels on controls, and animation stops for people who prefer reduced motion.

## 2. Colour
| Token | Light | Use |
|---|---|---|
| `--teal` / `colors.teal` | #256b73 | Brand, primary buttons, selected state, links |
| `--teal-dark` | #1d565d | Headings on tinted backgrounds, link hover |
| `--teal-light` | #eaf4f3 | Tinted backgrounds (icon circles, selected cards) |
| `--cream` | #f7f5ef | Page background |
| `--white` | #ffffff | Cards, inputs |
| `--text` | #17202a | Body text |
| `--muted` | #5b6870 | Help text (5.3:1 on cream) |
| `--border` | #d8e0df | Borders |
| `--danger` | #c0354a | Errors |
Warm accents (amber, coral) appear only in illustrations. Dark mode swaps the same tokens; never hard-code a colour in a component.

## 3. Typography
- **Fonts:** Plus Jakarta Sans for English; Noto Sans Devanagari for Hindi and Marathi; Noto Sans Bengali for Bengali (the right one is picked automatically). Weights 400, 500, 600, 700, 800.
- **Scale (web):** page title `clamp(24px, 3.4vw, 32px)`, section title `clamp(19px, 2.4vw, 23px)`, card title 16.5 px, body 15 px, help text 13.5 px. On the phone: 22 / 18 / 15 / 14 / 12.5.
- Inputs are 16 px on phones so iOS does not zoom.

## 4. Shape, size and depth
| Thing | Radius | Height | Border | Shadow |
|---|---|---|---|---|
| Buttons, inputs, choice tiles | 12 | 46 web / 48-52 phone | 1.5 px | none (primary button has a soft one) |
| Cards, panels | 16 | content | 1.5 px | `--shadow-1` (soft) |
| Chips, badges, tags | fully round | 40-42 | 1.5 px | none |
Tokens: `--r-sm 10`, `--r-md 12`, `--r-lg 16`, `--tap 46`, `--shadow-1`, `--shadow-2` (web); `radius.sm/md/lg/pill` and `tap` in `mobile/src/theme.ts`.

## 5. Components
- **Primary button:** teal fill, white bold text. **Ghost button:** white, teal text, border. One primary button per screen.
- **Input:** white, 1.5 px border, teal border and 3 px ring on focus. Label above, help text below. Boxes for search, degree, field and college have a microphone.
- **Choice tile** (education level, where to work): icon, short label, optional hint; selected = teal border and tinted fill; radio behaviour.
- **Chip:** white pill with a `+`; when chosen it turns teal with a white check. Used for skills, industries, cities.
- **Skill umbrella card** (skills screen): a rectangle per category with an icon, the category name, how many skills it holds and a `n/total` badge once you choose some. The related skills sit inside as chips. Long cards show the first 8 and a "Show all (+n)" link; chosen skills always stay visible. A selected tray (sticky on the web) lists what you picked, with a Clear all button. Search opens every matching card. Practical categories (everyday skills, office, communication, customer service) come first. Code: `web/app/components/GroupedSkillPicker.tsx`, `mobile/src/components/GroupedSkillPicker.tsx`, icons and order in `skillIcons.ts`.
- **Illustration:** one per setup step, decorative only (hidden from screen readers), floating gently (web: CSS animation; phone: soft bobbing). Code: `Illustration`, `StepHero`.
- **Read aloud / microphone:** `ReadPage` (web, every screen), `ReadScreenButton` (phone), `MicButton`.
- **Toast / banner:** short message, `role="alert"` for errors, `role="status"` for success; the offline banner appears when the connection is lost.

## 6. Layout
- Phone first. Single column below 640 px; cards in a responsive grid above (`auto-fill, minmax(290px, 1fr)` for skill cards).
- Content width about 1100 px on laptops; forms about 560 px.
- Spacing steps: 4, 8, 12, 14, 16, 24, 32. Prefer 8 between chips, 14 between cards, 24 between sections.
- Safe areas on phones (`env(safe-area-inset-*)`), no sideways scrolling.

## 7. Motion
Short (120-200 ms) colour and position changes only. Illustration motion is slow and gentle. Everything stops when the device says "reduce motion".

## 8. Words
Short labels, same word for the same thing everywhere ("Skills", "Industries", "Where would you like to work?"). Every new English string needs Hindi, Marathi and Bengali in the catalogs (`web/messages/*.json`, `mobile/src/i18n_extra.ts`); the tests fail if one is missing.

## 9. Checklist for a new screen
- [ ] Uses tokens, not hard-coded colours or sizes
- [ ] Every control has a visible label and a 46/48 px tap area
- [ ] Focus ring visible with the keyboard; screen reader names make sense
- [ ] Works at 360 px wide and on a laptop; no sideways scroll
- [ ] Strings translated in all four languages
- [ ] "Read this page" reads something sensible
- [ ] Looks right in dark mode
- [ ] Test added if there is logic
