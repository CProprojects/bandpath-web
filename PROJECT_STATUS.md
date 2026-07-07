# BandPath — Project Status

_Last updated: 2026-07-07_

BandPath is an IELTS Academic exam-prep platform (web + Telegram bot) targeting Uzbekistan-based users, sourced from a Telegram channel (`t.me/mockieltstest`). This document summarizes the product vision, what's been built so far, and the feature roadmap discussed so far.

---

## 1. What you want (product vision)

### Core product
- A Next.js website + companion Telegram bot for IELTS Academic prep: reading and listening mock tests, vocabulary training, and (eventually) gamification and payments.
- Design system: the **premium dark-theme gallery style** (`BandPath Home.dc.html`) — navy `#0f2744`/`#162d4a` backgrounds, cyan accent `#00C4FF`, Plus Jakarta Sans font, glassmorphism cards. This overrides an earlier, more minimal design spec that appeared in the original build prompt.
- Responsive layout: **desktop-first** with a left sidebar nav (Home / Tests / Vocabulary / Upgrade), and a bottom tab bar on mobile — matching the original design brief's intent, prioritizing PC users.

### Login
- No Google OAuth / email-only login as the primary path. Instead: **Telegram bot-code login** — user clicks "Continue with Telegram," it opens your bot, the bot sends a 6-digit code, user types it into the site to log in. Email/password still exists as a secondary option.
- Rationale: your users are already on Telegram; this removes friction versus email signup.

### Data use policy
- Telegram/user data collected (name, Telegram ID, activity) is for **BandPath's own first-party marketing only** — explicitly **not for sale to third parties**. This constraint should hold for any future data-handling feature (e.g. broadcast tool, analytics, partnerships).

### Test content
- Original scope: 2 example tests (1 reading, 1 listening). Since expanded to your full library: **11 reading tests + 7 listening tests** (18 total), each listening test backed by 4 audio files.
- **Future scale target: at least ~200 reading + listening tests combined**, eventually including a vocabulary section and more question types (currently these tests use a mix of types like fill-in-blank and matching; you specifically want **filters/question-type variety — e.g. true/false/not-given, multiple choice** — as a future addition to the test-taking experience, in addition to the existing Reading/Listening/All filter).
- Test files are self-contained legacy HTML (their own timer, palette, grading, results UI) — decision was made early on to **keep these almost entirely as-is**, wrapping them in a thin adapter (fix the Home button to navigate the parent app, namespace localStorage keys per test so multiple tests of the same type don't collide, and post a `window.postMessage` on submission so the Next.js app can record the result) rather than rewriting them as React components.

### Vocabulary (in progress, built this session)
- Vocabulary tied to specific tests: after choosing a test, the student can either **Start Test** or **Practice Vocabulary** — vocab words are the ones actually used in that test's passage.
- Game-like 3-stage flow per word-batch: **flashcard learn → multiple-choice quiz → spelling practice**, then a summary screen showing XP earned.
- Batches must be small: **6-8 words per "Part"** (Part 1, Part 2, Part 3...), not all words at once — this was corrected from an initial version that showed all 20+ words in one sitting.
- **XP model:** 2 XP per word, awarded **only once per word, only on a correct answer** — skipping or getting a word wrong must not spend its XP; the student can redo it later and still earn the XP once they get it right. (This was a real bug found and fixed this session — see §3.)
- Redoing a part for practice is free and encouraged ("it's more about learning") — no XP farming on words already mastered, but no restriction on how many times a student can practice.
- Also wanted: a top-level **Vocabulary** section in the sidebar/mobile nav (not just accessible per-test) — built as a hub showing streak, total XP, and per-test progress, plus a "Practice Today" button.
- You said you'll **send a UI design for the vocabulary section** at some point — current implementation uses the existing design-system components as a functional placeholder; visual polish is expected to follow once the design arrives.
- Listening-test vocabulary is **on hold**: the listening HTML files contain no transcript text, only questions and answer keys, so there's no source text to extract "words used in this test" from. Options discussed: you send transcripts separately, or extraction waits until transcripts exist.

### Gamification & XP/streak (started this session, more planned)
- Daily streak + XP system, explicitly meant to feel like **Duolingo-style gamification**: daily streak counter, XP total, and (eventually) a **leaderboard**.
- Agreed build order early in the project: **Tests → XP/leaderboard → Vocabulary → Payments.** In practice, XP/streak plumbing ended up being built alongside vocabulary (since vocab was the first feature to actually need it), and test completion was wired into the same XP/streak system. A dedicated **leaderboard view** is still not built.
- Future idea (mentioned, not yet scoped in detail): an XP **shop** — spending earned XP on something (specifics not yet discussed).

### Payments (not started)
- Explicitly **not Stripe** — flagged early that Stripe likely doesn't support Uzbekistan payouts/cards well for your user base.
- Planned instead: **Payme and/or Click** (Uzbekistan-specific payment providers), to unlock the Pro plan.
- You have **not yet registered merchant accounts** with either provider — this is a real blocker before payment integration can start.
- Current state: since there is no way to actually purchase Pro yet, **all 18 tests were deliberately made free** rather than gating content behind an unpurchasable plan. Revisit test/vocab gating once Payme/Click is live.

### Admin / broadcast
- Wanted a way to **message all users who have started the Telegram bot** (a broadcast tool) for marketing/announcements — built and gated to admin Telegram IDs.

### Scaling cost awareness
- You asked what it would cost to scale to ~200 tests + vocabulary. Answer given: **storage is not the bottleneck** (audio for ~100 listening tests would be a few GB, well within Supabase's included quota) — **bandwidth from actual usage** is the real cost driver, and it scales with active users, not catalog size. Realistic baseline once you outgrow free tiers: roughly $45/mo (Supabase Pro $25 + Vercel Pro $20), with bandwidth overage only kicking in at real scale (thousands of active users). This does **not** include the cost of producing/curating 200 tests worth of content, which is a much bigger unknown.

---

## 2. What's already built and live

**Live URL:** https://bandpath-web.vercel.app

### Stack
- Next.js 16.2.10 (App Router, Turbopack), TypeScript, Tailwind v4 (CSS-based theme in `globals.css`, no `tailwind.config.js`).
- Supabase: Postgres + Auth + Storage. Project ref `sgglqnsujxgdbwmxzgdh`.
- Vercel: hosting/deploys, auto-deploy from GitHub `main` branch push.
- GitHub repo: `CProprojects/bandpath-web` (public, due to a Vercel Hobby-plan restriction on private-repo collaboration when the git author isn't the repo owner).

### Auth
- Telegram bot-code login: `@BandPathLoginbot`, deep-link + 6-digit code flow, mints a real Supabase session server-side (via `generateLink`/`verifyOtp`) without ever sending a literal email.
- Email/password login also available as a secondary path.
- 7-day free trial on signup (`trial_ends_at`), though nothing currently gates on trial expiry since all content is free right now.

### Tests
- All **18 tests live** (11 reading, 7 listening), each with:
  - Adapter: fixed Home button, namespaced localStorage keys, `postMessage` result reporting into the Next.js app.
  - Listening tests' audio streams from a public Supabase Storage bucket (`audio`), not local files.
  - Results saved to `test_results` table, viewable on a per-test results page (band score, accuracy, time).
  - Test library (`/tests`) has Reading/Listening/All filter tabs and shows your best band per test.
  - All 18 currently **free** (no Pro gating) — see payments note above for why.
- Test-completion awards **+30 XP** and counts toward the daily streak.

### Vocabulary
- All **11 reading tests** have curated word lists (20-22 words each, pulled directly from that test's own passage text) — English meaning + Uzbek + Russian translation per word.
- Each test's words are split into **parts of 6-8 words**, chosen from a parts-list page (`/vocabulary/[testId]`).
- Per-part practice session (`/vocabulary/[testId]/[part]`): learn (flashcard) → quiz (multiple choice, distractors drawn from the same word batch) → spelling (typed input) → summary (XP earned this session).
- **Spaced repetition**: a simplified Leitner-style schedule (1/3/7/14/30/90-day intervals) tracks each word per user and resurfaces it for review; a global "Practice Today" session (`/vocabulary/all`) pulls due + new words across all tests.
- XP: 2 per word, paid out once, only on a correct spelling answer (bug where wrong/skipped answers still banked XP was found and fixed this session).
- Vocabulary hub (`/vocabulary`) shows streak, total XP, and per-test mastery progress; a **Vocabulary** link now lives in the sidebar/mobile nav alongside Home/Tests/Upgrade.
- Listening-test vocabulary: not started (blocked on lack of transcripts, see above).

### Gamification
- `users.xp_total` and `users.streak_count` columns; `daily_activity` table tracks per-day tests completed, words reviewed, and XP earned.
- Streak logic: increments once per calendar day of activity (test completion or vocab practice), resets if a day is missed.
- No leaderboard UI yet — the data exists (`xp_total`, `streak_count`) but there's no page ranking users against each other.

### Admin
- `/admin/broadcast`: send a message to every user who has a Telegram ID on file (i.e. everyone who's started the bot), gated to `ADMIN_TELEGRAM_IDS`.

### Infra verification habits
- Every feature this session was verified with real (then cleaned-up) test data via simulated login + API calls before being called done — not just "it built successfully."

---

## 3. Notable fixes made this session

- **Vocab batch size**: reworked from showing all 20-22 words at once to 6-8 word "Parts," with a parts-list page per test.
- **XP model rework**: from a scattered 5 (quiz) + 10 (spelling) XP split down to a flat 2 XP per word, paid once.
- **XP-on-wrong-answer bug**: the first version incorrectly banked a word's XP on the very first *attempt* regardless of correctness — meaning skipping or failing a word still paid out XP and permanently blocked it from ever paying out again. Fixed so XP (and the "already paid" flag) only sets on an actually-correct answer; wrong/skipped words remain eligible for XP once genuinely answered right later.

---

## 4. Open items / near-term roadmap

Roughly in the order they're likely to come up next:

1. **Vocabulary UI redesign** — waiting on the design file you said you'd send.
2. **Listening-test vocabulary** — needs transcripts (from you) or another word source before it can be built the same way as reading.
3. **Leaderboard** — XP/streak data already exists; needs a ranking UI.
4. **Question-type variety** — true/false/not-given, multiple choice, etc. as filterable practice modes (distinct from the existing Reading/Listening/All filter).
5. **Scaling to ~200 tests** — mechanically cheap to add (same adapter script approach used for the 16 tests added this session) and cheap to host (see cost section), but content production/curation at that scale is a bigger lift and not yet planned in detail.
6. **Payments (Payme/Click)** — blocked on you registering merchant accounts; once available, revisit which tests/vocab should move behind the Pro plan.
7. **XP shop** — mentioned as a future idea, not yet scoped.
