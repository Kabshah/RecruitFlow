# CLAUDE.md — RecruitFlow AI™
**AI Recruitment & Candidate Screening Automation System**
Client: TalentBridge Recruitment (Australia) · BranDive Media Solutions · 7-Day Sprint

This file is the single source of truth for Claude Code while building this project. Read it fully before writing any code. Follow the phase order under "Build Plan" — do not jump ahead to later modules before earlier ones are working and tested.

---

## 1. Project Summary

Build an AI-powered recruitment assistant that:
1. Ingests resumes (PDF/DOCX) from multiple intake channels
2. Parses candidate information out of them
3. Scores each candidate against a job description (0–100, with explanation)
4. Schedules interviews for qualified candidates automatically
5. Updates an ATS (simulated) with candidate status
6. Sends automated emails at every stage
7. Shows all of this on a recruiter dashboard

Everything should be demoable end-to-end by Day 7: a resume goes in, and a scored, scheduled, emailed, dashboard-visible candidate comes out with zero manual recruiter effort (except optional review/override).

This is a demo/sprint build on a $0 budget, but the client may approve extending it into a real engagement afterward — so favor clean, modular structure (§9) and pluggable pieces (extra intake channels, extra job openings, extra roles) over shortcuts that would need a rewrite later. "Free and extendable" beats "free and disposable."

---

## 2. Locked-In Technology Decisions

Do not substitute these without asking first — they were chosen deliberately for cost ($0, no credit card) and fit.

| Layer | Choice | Why |
|---|---|---|
| LLM | **Gemini API** (`gemini-2.5-flash` or latest flash-tier model available at build time — check current model names, don't assume) as primary, with a **Hugging Face Inference API** fallback (your existing HF credits) for when Gemini's free-tier rate limit is hit or a call fails/times out | Already the mandated provider for this sprint. Free tier is generous enough for scoring + parsing + email drafting at intern-project volume, but a 7-day sprint can still burst past the per-minute limit — having a fallback means a rate-limited moment doesn't stall or break the demo. |
| LLM fallback model (HF) | Configurable via `HF_MODEL_NAME` in `.env` — **don't hardcode a specific model name in code.** Pick whichever instruction-tuned model you have credits/quota for at build time and set it in config. | Model availability/pricing on HF shifts; keeping it as a config value (not a hardcoded string scattered through the code) means swapping models later is a one-line `.env` change, not a code change — same principle as §9's "config over hardcoding." |
| Resume parsing (native PDF/DOCX text) | `pdfplumber` / `PyMuPDF` for PDF, `python-docx` for DOCX | Most resumes are digitally generated, not scans — extract text directly first, no OCR needed for these. |
| OCR (fallback only) | **PaddleOCR** — see §3 for the pipeline logic | Used only when a resume is a scanned image or text extraction returns near-empty content. |
| Workflow automation | **n8n, self-hosted via Docker** (this is the only option — no n8n cloud) | Mandated in the brief; orchestrates the pipeline between modules; fully free and already what's on hand. |
| Database / ATS backing store | **Supabase** (free tier, Postgres) | Free, generous limits, no credit card required, gives you a real Postgres DB plus instant REST API — better than juggling Airtable/Sheets API quirks for a 7-day sprint. |
| ATS simulation UI | Airtable (free tier) *synced from Supabase*, OR just build the "ATS view" as a page in the dashboard reading from Supabase directly | Simpler to have Supabase as the single source of truth and present it two ways (dashboard + optionally an Airtable base for the "ATS" deliverable screenshot) than to sync two independent databases. Default to Supabase-only unless client deliverable specifically needs an Airtable link. |
| Calendar | **Google Calendar API**, using the **same single dedicated Google account** as the Gmail integration (one Google Cloud project, both APIs enabled on it) — no per-recruiter calendars for this sprint | Genuinely free forever for this scale. One account for both Gmail + Calendar avoids a second OAuth setup; Calendly's free tier also works for the "booking link" concept but Google Calendar API gives you real programmatic event creation, which is what "AI schedules the interview" actually implies. |
| n8n webhook security | A **shared-secret header** (e.g. `X-Internal-Secret`, value in `.env` on both sides) that the Next.js backend sends on every call to the n8n webhook, and n8n's first workflow step validates before doing anything else — reject with no further processing if it's missing/wrong | n8n webhooks are publicly reachable URLs by default. Without this, anyone who finds/guesses the webhook URL could trigger the pipeline directly, bypassing the reCAPTCHA/honeypot/file-validation checks on the actual apply form. Free, no extra service — just one header check. |
| Interview slot rules | **60-minute slots, 15-minute buffer between consecutive interviews**, within a configurable working-hours window (default: Mon–Fri, 9:00–17:00 Australia/Sydney) — all as named constants in the config module (§9), not hardcoded inline | Resolves the "whose hours, how long, how much gap" ambiguity in the brief with one clean, adjustable default rather than leaving the scheduling logic to guess. |
| Duplicate candidate detection | **`rapidfuzz`** (free, MIT-licensed, pure-Python/C++ fuzzy string matching — no paid service, no API call) | **Scoped to the same job opening, not globally.** The same person applying to *different* job openings is normal, legitimate recruiting behavior (candidates commonly apply to multiple roles) — that just links to the same `candidates` record via a new `applications` row, no flag. The check only fires when there's a match **for the same `job_opening_id`**: (1) exact match on email or phone → certain duplicate (spam/accidental resubmit to the same role); (2) if no exact match, `rapidfuzz.fuzz.token_sort_ratio` on candidate name (and optionally a normalized slice of resume text) above a configurable threshold (start at 90) → flagged as a **possible duplicate for recruiter review**, not auto-merged. Auto-merging on a fuzzy match alone is a bad practice — false positives would silently hide a genuinely different candidate. |
| Email sending | **Gmail API** (OAuth against a Gmail account, free, no credit card) as primary. **Resend** (free tier: 3,000 emails/month, 100/day, no credit card) as a documented alternative/backup if Gmail API OAuth setup is a blocker. | Both are genuinely free with no card. **Important:** Resend's free tier can only send to your *own verified* email address until you verify a sending domain — it can't email real candidates on the free tier without that step. Gmail API has no such restriction, which is why it's the primary, not just a preference. Do NOT use SendGrid — its free tier is now a 60-day trial only, not permanent, as of 2026. |
| Frontend | **Next.js** + Tailwind CSS, one app with two route groups: public **Careers Website** and internal **HR Portal** — see §5 for full spec | Matches suggested stack. |
| File storage (resumes) | **Supabase Storage** (same free project as the DB — 1GB free, no credit card) | One less service to wire up; resumes live next to the rest of the data, `resume_file_url` in the schema points here. |
| Spam / abuse protection on the public apply form | **Google reCAPTCHA v3** (free, no credit card, just a site key) + a hidden honeypot field + server-side file type/size validation (accept only `.pdf`/`.docx`, cap size e.g. 5MB) | The apply form is public on the internet — needs *some* protection or it'll get bot-submitted junk. All three layers are free and add no real build time. |
| Timezone | All timestamps stored in **UTC** in Supabase; displayed and scheduled in **Australia/Sydney** (client is AU-based) using `zoneinfo`/`date-fns-tz` | Client, interview slots, calendar events, and email send-times must all agree on one timezone or reminders land wrong. |
| CI | **GitHub Actions** (free — unlimited minutes on a public repo) running lint (`ruff`/`eslint`) + tests (`pytest`/Vitest) on every push | Repo is public, so this costs nothing and directly backs up the "best practices" requirement — broken/unformatted code gets caught automatically instead of manually. |
| Version control | Git & GitHub (public repo) | As required for deliverables; public also unlocks free-tier GitHub Actions minutes for CI above. |

*Hosting is deliberately out of scope for now — build and run everything locally / against free-tier hosted services (Supabase, n8n) without deploying the frontend anywhere yet. Add a hosting step later once the app is working end-to-end.*

### Environment variables to set up (`.env`, never commit this file)
```
GEMINI_API_KEY=
HF_API_TOKEN=
HF_MODEL_NAME=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
# ^ one shared OAuth client + one refresh token for the single dedicated
#   Google account, requesting BOTH the Calendar and Gmail-send scopes
#   together — no need for two separate OAuth setups.
# ^ IMPORTANT: set the OAuth consent screen to "In production" (not
#   "Testing") in Google Cloud Console. In Testing mode, refresh tokens
#   expire after 7 days — exactly the length of this sprint — which would
#   silently break Gmail/Calendar mid-build. The scopes used here (Gmail
#   send, Calendar) are non-sensitive enough that Google doesn't require
#   app verification to publish, so this is a one-click fix, not a delay.
RESEND_API_KEY=       # optional fallback
N8N_WEBHOOK_BASE_URL=
N8N_WEBHOOK_SECRET=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
DEFAULT_TIMEZONE=Australia/Sydney
```

---

## 3. OCR: PaddleOCR (fallback only)

Most resumes are digitally generated PDF/DOCX, not scans — try direct text extraction first, and only fall back to OCR when that comes back empty/near-empty. PaddleOCR (PP-OCRv5 / PP-StructureV3) is the OCR engine for that fallback path: free, runs comfortably on modest hardware (a GTX 1660 Super or CPU-only), and handles the structured field extraction (name, email, skills, dates) this needs.

**Pipeline logic:**
```
resume file in
 → if PDF: try direct text extraction (pdfplumber/PyMuPDF)
 → if DOCX: python-docx
 → if extracted text length < threshold (e.g. <100 chars) OR file is image-based:
     → run PaddleOCR on rasterized pages
 → pass resulting raw text to Gemini for structured field extraction (see §6)
```

---

## 4. Bonus Features In Scope

Build these six (already selected — do not add/swap without confirming):

1. **AI Resume Ranking Dashboard** — sortable/filterable candidate list ranked by score, per job opening.
2. **Duplicate Candidate Detection** — detect the same person applying **to the same job opening** multiple times (spam/accidental resubmit — via email/phone exact match, or fuzzy name+resume similarity via `rapidfuzz`, see §2 for the exact approach) and flag as a possible duplicate for recruiter review. Applying to *different* job openings is normal candidate behavior, not a duplicate — it just links to the existing candidate record.
3. **AI Interview Question Generator** — Gemini generates a short set of role-specific interview questions per shortlisted candidate, based on their resume + the job description (surface skill gaps as question prompts).
4. **Candidate Skill Gap Analysis** — Gemini compares candidate's extracted skills against job requirements and outputs a structured gap list (missing required skills, partially matched skills, nice-to-have gaps) — this feeds both the score explanation and the interview question generator.
5. **Voice Interview Scheduling Assistant** — use the browser's native **Web Speech API** (`SpeechRecognition` for candidate speech-to-text + `SpeechSynthesis` for the assistant's text-to-speech), not ElevenLabs. Reasoning:
   - Web Speech API is **built into the browser** — zero setup, zero API key, zero cost, and it covers *both* directions (listening and speaking) that a voice assistant actually needs.
   - ElevenLabs only does text-to-speech (the assistant talking), not speech-to-text (understanding the candidate) — you'd still need a separate free STT solution anyway, so it doesn't actually simplify anything here.
   - ElevenLabs' free tier (10,000 characters/month, no credit card) explicitly **disallows commercial use** — audio carries a watermark/attribution requirement, and this is a client deliverable, not a personal project, so that restriction is a real risk, not a technicality.
   - Trade-off to accept: Web Speech API's TTS voice is robotic (not premium-quality like ElevenLabs), and STT browser support is inconsistent — reliable in Chrome/Edge, partial/unreliable in Firefox/Safari. For a 7-day sprint demo, build and demo this in Chrome and note the browser requirement in the README rather than burning time chasing cross-browser STT support.
   - Keep the scope tight either way: a working voice-driven slot confirmation over a small set of available times is sufficient — don't over-engineer a full voice agent.
6. **Recruitment Analytics with AI Insights** — dashboard panel where Gemini generates a short natural-language summary over the current pipeline data (e.g., "Time-to-hire is trending up for the Backend Engineer role because...", "Candidate quality this week is higher than last week based on average score").

Skill Gap Analysis (#4) should be built as a shared module — both the Scoring Engine and the Interview Question Generator consume its output, don't duplicate the logic.

---

## 5. Frontend & Design Spec

The frontend is **two separate surfaces** in the same Next.js app, on separate route groups — don't blend them into one generic UI:

### 5.1 Public Careers Website
A real company careers site — this is candidate-facing, so it should look and feel like an actual corporate careers page, not an admin tool:
- **Home / landing page** — brief company intro, a "View Open Roles" call to action.
- **Careers listing page** — list of open job openings (title, location, department, short blurb), pulled from the `job_openings` table. Searchable/filterable if time allows.
- **Job detail page** — full job description, requirements, "Apply Now" button.
- **Application form page** — candidate fills in basic fields (name, email, phone, location, LinkedIn/portfolio URL, cover note optional) **and uploads their resume file** (PDF/DOCX) in the same form. Include:
  - A **consent checkbox** — "I consent to my data being processed for recruitment purposes" (required to submit). Store `consent_given: true` + `consent_at` timestamp on the application record. This is a genuinely free, one-checkbox addition and matters for an Australia-based client (Privacy Act 1988 territory) — good practice, not legal advice.
  - **reCAPTCHA v3 + a hidden honeypot field**, both free, plus server-side validation rejecting anything that isn't a `.pdf`/`.docx` under the size cap. This is public-facing on the open internet — it needs *some* bot/spam protection before it goes live, even for a demo.
  - On submit: resume + form fields go into the intake pipeline (§8, Phase 2). Show a clear confirmation state after submit (this also triggers the "Application Confirmation" email in Phase 5). The confirmation screen/email should include a **status lookup link or ID** — see below.
- **"Check My Application Status" page** — candidate enters their email (+ the application reference ID from their confirmation email) and sees their current stage (Received / Under Review / Shortlisted / Interview Scheduled / Not Selected). No login system needed — a simple email + reference-ID lookup against the `applications` table is enough, and it directly satisfies the "Candidate can view application status" requirement from the brief without building a full candidate auth system.

### 5.2 HR Portal (internal, auth-gated)
This is the recruiter/admin side — the "Recruiter Dashboard" referenced elsewhere in this doc is this portal:
- Login (simple auth — Supabase Auth is fine, don't over-engineer this for a sprint).
- Two roles, stored on the `recruiters` table (`role: 'recruiter' | 'admin'`), gating a small number of screens — don't build a full permissions system, just an `if role === 'admin'` check on the routes below:
  - **Recruiter** can: review shortlisted candidates, override AI decisions, view scores, approve interview schedules, monitor campaigns — i.e. everything below except job posting management.
  - **Admin** additionally can: **create/edit job openings** (the screen that actually populates the public careers listing — without this, the careers site has nothing to show), configure scoring criteria/thresholds, view recruitment analytics, configure integrations. This directly matches the "Administrator" role in the original brief.
- **Job Opening management screen (admin-only)** — form to create/edit a `job_openings` record: title, description, location, and **structured requirements** (see §7 for the exact schema) rather than a single free-text blob, since the scoring engine needs structured fields to compare against consistently.
- Pipeline view — applications by stage, per job opening.
- Resume Ranking Dashboard — sortable/filterable candidate list by score.
- Candidate detail view — parsed profile, score + explanation, skill gap analysis, generated interview questions, recruiter override controls (approve/reject/move stage).
- Recruitment Analytics panel — Gemini-generated insights.
- This is where **HR actually receives and reviews the resumes** that come in through the public careers site — every application submitted on the public site lands here.

### 5.3 Visual Design / Theme
- **Color scheme: blue and white** (professional, corporate, trustworthy) — **no purple**, and avoid it even as an accent. Think clean SaaS/corporate-careers-page look: white/light-gray backgrounds, blue for primary actions, headers, links, and accents; use a neutral gray for body text, not pure black.
- The public careers site should look like a real company website (polished, marketing-adjacent, generous whitespace, clear typography hierarchy) — this is what candidates judge the "company" by.
- The HR portal can be more utilitarian/data-dense (tables, filters, status badges) but should stay in the same blue/white palette for consistency — don't theme it differently from the public site.
- When actually building the UI (not just this planning doc), pull in the project's `frontend-design` guidance for concrete spacing/typography/token choices rather than defaulting to generic Tailwind boilerplate — a stock `bg-purple-600` template look is exactly what we're avoiding here.

---

## 6. System Architecture

```
Public Careers Website (job listings → job detail → apply form: fields + resume upload)
        ↓
Resume Parser  (direct text extraction → PaddleOCR fallback)
        ↓
Gemini: Structured Field Extraction  (name, email, phone, education, skills,
        certifications, experience, employers, location, LinkedIn/portfolio)
        ↓
Duplicate Candidate Detection  (check against Supabase before insert)
        ↓
Gemini: Candidate Scoring + Skill Gap Analysis  (score /100, classification,
        explanation, gap list)
        ↓
Supabase (ATS record created/updated: candidate info, resume, score, status,
        stage, recruiter assignment)
        ↓
Branch: score >= 60 → Interview Scheduling flow
        score < 60  → Rejection email flow
        ↓
Interview Scheduling  (Google Calendar API: create event + slots,
        Voice Scheduling Assistant for slot confirmation)
        ↓
Gemini: Interview Question Generator  (per candidate, attached to ATS record)
        ↓
Email Automation  (Gmail API primary / Resend fallback: confirmation,
        shortlist notice, interview invite, reminder, rejection)
        ↓
HR Portal (Next.js + Tailwind, blue/white theme: pipeline view, ranking dashboard,
        candidate detail, analytics panel, recruiter override controls)
```

n8n orchestrates the arrows above as webhook-triggered workflows — see the split of responsibility below for exactly what lives where.

**Split of responsibility (so this isn't ambiguous while building):**
- **Python backend** (the `backend/` structure in §9) owns all actual logic: parsing, OCR fallback, Gemini calls, scoring, skill gap analysis, duplicate detection, Calendar/Gmail API calls. It's exposed as a small set of HTTP endpoints (e.g. `POST /intake`, `POST /score`, `POST /schedule`).
- **n8n** owns *orchestration only*: it receives the webhook when a candidate submits the apply form, **checks the `N8N_WEBHOOK_SECRET` header first and rejects the request immediately if it's missing or wrong** (§2), then calls the backend endpoints in sequence, handles branching (score ≥ 60 vs < 60), and is what you export as the `n8n Export` deliverable and draw as the `AI Workflow Diagram`.
- Do not duplicate business logic inside n8n Function nodes — n8n nodes should just be "call this backend endpoint with this payload," not reimplementations of scoring/parsing logic. This keeps the logic testable (§9) in one place instead of split across two systems.

---

## 7. Database Schema (Supabase / Postgres) — starting point

```sql
-- job_openings
id, title, description, requirements_json, location, language_requirements,
created_at

-- requirements_json shape (used by the scoring engine + the admin job-posting
-- form in §5.2 — keep this structured, not free text):
-- {
--   "required_skills": [{"skill": "React", "weight": 3}, ...],
--   "nice_to_have_skills": [{"skill": "GraphQL", "weight": 1}, ...],
--   "min_years_experience": 3,
--   "education_requirement": "Bachelor's in CS or related",
--   "certifications_required": [],
--   "language_requirements": ["English"],
--   "location_preference": "Remote (Australia)"
-- }

-- candidates
id, name, email, phone, education_json, skills_json, certifications_json,
years_experience, previous_employers_json, location, linkedin_url,
resume_file_url, raw_resume_text, created_at

-- applications  (join: candidate <-> job_opening, one row per apply event)
id, reference_code, candidate_id, job_opening_id, score, classification,
score_explanation, skill_gap_json, application_stage, interview_datetime,
recruiter_id, is_duplicate_of, consent_given, consent_at,
created_at, updated_at
-- reference_code: short public-safe code (e.g. "RF-2G7K9") shown to the
-- candidate on their confirmation email/screen and used (with their email)
-- for the "Check My Application Status" lookup in §5.1 — don't expose the
-- raw internal `id` for this.

-- interview_questions
id, application_id, questions_json, created_at

-- email_log
id, application_id, email_type, sent_at, status

-- recruiters
id, name, email, role   -- role: 'recruiter' | 'admin', see §5.2
```

Resume files themselves go in **Supabase Storage** (a private bucket, e.g. `resumes/`), with `resume_file_url` pointing to the stored object — not the DB itself.

All `*_at` / `*_datetime` columns are stored in UTC; convert to `Australia/Sydney` only at the display/scheduling/email-template layer (see the Timezone row in §2) — never store local time directly.

Adjust field names as you go, but keep `applications` as the central pipeline-state table — the dashboard, scoring, scheduling, and email modules should all read/write through it.

---

## 8. Build Plan — follow this order

**Phase 1 — Foundations**
- Repo scaffold, `.env.example`, Supabase project + schema above, basic Gemini API call test, basic n8n instance running (self-hosted, Docker).
- Set up the Google Cloud project + OAuth client for the dedicated Google account (§2): request Calendar + Gmail-send scopes together, **and publish the OAuth consent screen to "In production" immediately** (not left in "Testing") — otherwise the refresh token expires in 7 days, which is the whole sprint.
- Set up a `seed/` directory as the one place all test/demo data lives: `seed/job_openings.json` (a couple of sample job openings with structured requirements) and `seed/resumes/` (sample resume files — **synthetic/fake candidates only, never real people's data**, since the repo is public). A small `seed.py` script loads these into Supabase for local development and demoing — standard practice so the pipeline can be exercised end-to-end without waiting on real applicants. Resume samples themselves will be supplied separately, not generated by Claude Code.
- Since the repo is **public**: add a pre-commit reminder / README note that no real candidate PII, API keys, or `.env` values are ever committed — only synthetic seed data.

**Phase 2 — Careers Website + Resume Intake + Parsing**
- Build the **public Careers Website** (Next.js, blue/white theme per §5.3): home page, careers listing page (pulls from `job_openings`), job detail page, application form page (candidate fields + resume upload + consent checkbox + reCAPTCHA v3/honeypot + file validation, per §5.1). This is the *only* intake channel for this sprint.
- Build the **admin Job Opening management screen** (§5.2) early too — the careers listing has nothing to show without it. This can be a bare-bones form at first; polish later.
- Build the **"Check My Application Status"** lookup page (§5.1) — email + reference code against `applications`.
- Email inbox, Google Forms, and LinkedIn intake are **out of scope for now** — noted in the brief as future channels, don't build them yet. Design the upload handler so a new intake source can be plugged in later without reworking the parsing pipeline (i.e., every channel should ultimately just drop a resume file + minimal metadata into the same intake function).
- Direct text extraction (PDF/DOCX) → PaddleOCR fallback (§3).
- Gemini structured field extraction → write to `candidates` table.

**Phase 3 — Duplicate Detection + Scoring + Skill Gap**
- Duplicate check **scoped to the same job opening** (email/phone exact match + fuzzy resume similarity, per §2) — a candidate applying to a *different* job opening is not a duplicate, just a second `applications` row against the same `candidates` record.
- Gemini scoring against a job description → `applications` table, with classification bands (90–100 Highly Recommended / 75–89 Recommended / 60–74 Consider / <60 Not Recommended) and explanation text.
- Skill gap analysis module (shared, per §4).

**Phase 4 — Scheduling + Interview Questions**
- Google Calendar API integration: create interview slots/events for score ≥ 60, using the slot-duration/buffer/working-hours rules in §2 (60-min slots, 15-min buffer, configurable working-hours window).
- Voice Interview Scheduling Assistant for slot confirmation, using the browser's **Web Speech API** (§4) — build/demo in Chrome, note the browser requirement in the README.
- Gemini interview question generator, tied to skill gap output.

**Phase 5 — Email Automation**
- Gmail API integration (primary), templates for: application confirmation, shortlist notice, interview invite, reminder, offer notice (concept), rejection.
- **Which Gmail account sends the emails is a config choice, not a code decision** — the OAuth client ID/secret/refresh token in `.env` (§2) are the only thing that ties the integration to *any particular* Gmail account. Don't hardcode an account anywhere in the code; whichever account's OAuth credentials go into `.env` is the one that sends. This means swapping from a personal test account to a dedicated project account later is a config change, not a rewrite.
- Recommendation if you want a default to start with: create one fresh, dedicated Gmail account for this project (e.g. something like `recruitflow.ai.demo@gmail.com`) rather than your personal one — costs nothing, takes two minutes, and keeps personal inbox/OAuth scopes separate from a client-facing deliverable. But this is a preference, not a requirement — the code doesn't care either way.
- Resend fallback path documented (not necessarily both wired live — pick one as default, document the other as swap-in).

**Phase 6 — HR Portal**
- Build the internal **HR Portal** (Next.js, auth-gated, same blue/white theme, per §5.2): pipeline view (applications by stage), Resume Ranking Dashboard, candidate detail view, recruiter override controls, Recruitment Analytics panel (Gemini-generated insights), and the recruiter/admin role gate (admin-only job posting management, scoring config). Run locally for now — no deployment yet (see hosting note in §2).

**Phase 7 — Test, Document, Package**
- End-to-end test with sample resumes (mix of text-based and scanned/image-based, to exercise the OCR fallback).
- README, architecture diagram (can be a Mermaid diagram in the README), prompt documentation (all prompt templates used — same ones serve both Gemini and the HF fallback via the `llm/` module, §9 — in one `PROMPTS.md`), screenshots, n8n export.

Do not start Phase N+1 until Phase N runs end-to-end on at least one real sample resume.

---

## 9. Coding Conventions & Best Practices

This codebase should read like production code, not sprint-hack code. Specifically:

**This applies to every module in this doc, old and new alike.** The additions in §2/§5/§7 (Supabase Storage, reCAPTCHA/honeypot validation, consent handling, the status-lookup page, role gating, the admin job-posting screen, the structured `requirements_json` schema) are not exceptions or "just glue code" — they get the same standard: typed, tested, no magic strings, no logic dumped inline. A quick admin CRUD form is still a properly separated form-validation + API-call + error-state component, not a 200-line page with everything jammed together.

**No unnecessary docstrings/comments.** Don't docstring or comment things whose purpose is already obvious from a well-named function/variable — `def get_candidate_by_id(candidate_id: str) -> Candidate` needs no docstring restating that. Reserve comments/docstrings for genuinely non-obvious things: *why* a decision was made (e.g. why OCR only triggers below a text-length threshold), tricky business rules (e.g. the score classification bands), or public API contracts on the backend's HTTP endpoints. Code should be readable from good naming and structure first, explained second — not the other way around.

**No dumped-in-the-middle-of-a-function prompt strings.** Never write Gemini prompts as inline triple-quoted blobs sitting in the middle of business logic. Every prompt lives in its own file under `prompts/` (e.g. `prompts/score_candidate.py` or `.txt`/`.jinja` template), loaded and rendered by a small, single-purpose prompt-loading utility. Business logic calls `render_prompt("score_candidate", **vars)` — it never contains raw prompt text itself. This also directly produces the `PROMPTS.md` deliverable with zero extra work: it's generated from the same source files.

**Structure, not one giant file.** Backend organized by responsibility, not by "everything in main.py":
```
backend/
  llm/             # single entry point for all model calls: tries Gemini, falls
                    # back to HF on rate-limit/error — everything else (scoring,
                    # extraction, etc.) calls THIS module, never Gemini/HF directly
  parsing/        # text extraction, PaddleOCR fallback
  extraction/      # Gemini structured-field extraction
  scoring/         # scoring + skill gap analysis
  scheduling/      # Google Calendar integration
  email/           # Gmail/Resend integration, templates
  ats/             # Supabase repository layer (all DB access goes through here — no raw queries scattered around)
  storage/         # resume upload → Supabase Storage, file validation
  intake_guard/    # reCAPTCHA + honeypot verification for the public apply form
  auth/            # recruiter/admin role checks
  prompts/
  tests/
```
Each module exposes a small, typed public interface (functions/classes), not a pile of loose scripts.

**Type hints everywhere** (Python: full type hints, mypy-clean; Next.js: TypeScript, not plain JS). No `Any` unless genuinely unavoidable.

**No magic strings.** Application stages, score classifications, email types, etc. are all enums/constants defined once (e.g. `ApplicationStage.SHORTLISTED`), never re-typed as raw strings across files.

**Separation of concerns.** LLM calls, DB calls, and pure business logic (e.g. classification-band logic, duplicate-match scoring) should be independently unit-testable — a scoring-band function shouldn't need a live Gemini call or a DB connection to be tested.

**Error handling is explicit, not silent.** Every external call (Gemini, HF fallback, Supabase, Google Calendar, Gmail) wrapped with proper exception handling and logging — no bare `except: pass`. Malformed LLM JSON output must fail loudly (logged + retried once) rather than silently defaulting to empty data.

**Testing — not optional.**
- `pytest` for the Python backend. Unit tests for: scoring/classification logic, skill-gap comparison logic, duplicate-detection matching logic, prompt-rendering utility, parsing fallback trigger logic (does it correctly decide when to invoke OCR vs. use direct extraction), file-validation logic (type/size checks), role-gate logic (recruiter vs admin), and the status-lookup query (email + reference code).
- Mock the Gemini/HF/Supabase/Google Calendar/Gmail/reCAPTCHA clients in unit tests — no real API calls in the test suite. A small number of integration tests (marked separately, e.g. `@pytest.mark.integration`) can hit real sandboxed services, but the default `pytest` run should be fast and network-free.
- At least one end-to-end smoke test: sample resume in → application record with score + status out.
- Frontend: component tests for the apply form (consent checkbox required, file type/size rejected correctly) and the admin job-posting form, using Vitest/React Testing Library.

**Formatting/linting on autopilot, not manually enforced.** `black` + `ruff` (Python), `eslint` + `prettier` (Next.js/TypeScript). Set these up in Phase 1, along with a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs lint + tests on every push, so nothing unformatted or broken ever gets committed unnoticed.

**Config over hardcoding.** Model names, score thresholds, classification bands, OCR fallback text-length threshold — all in one config module/file, not hardcoded inline where they're used.

**No secrets committed** — `.env` in `.gitignore`, `.env.example` committed instead.

**Small, working increments per phase over big-bang integration** — this is a 7-day sprint, keep every phase demoable and tested on its own before moving to the next.

---

## 10. Deliverables Checklist (map back to submission requirements)

- [ ] AI Workflow Diagram
- [ ] Resume Processing Workflow doc
- [ ] Candidate Scoring Logic doc
- [ ] `PROMPTS.md` — all prompt templates (shared by Gemini + the HF fallback)
- [ ] n8n workflow export (`.json`)
- [ ] ATS Design doc
- [ ] GitHub Repository
- [ ] README (setup, architecture, how each module works)
- [ ] Screenshots (public careers site — listing + job detail + apply form, HR portal dashboard, ranking view, sample emails, sample calendar event, sample interview questions, analytics panel)
- [ ] Demo video (optional but strengthens Presentation + Innovation marks)
- [ ] Presentation (max 10 slides)
