# RecruitFlow

An end-to-end AI recruitment pipeline geared towards actually saving HR time. RecruitFlow automates the most tedious parts of hiring: parsing resumes, scoring candidates objectively against job requirements, scheduling interviews, and handling email communications.

It features a clean Next.js frontend for both the public careers site and the internal HR Kanban dashboard, backed by a FastAPI Python server that coordinates the LLM inference, database logic, and Google Workspace APIs.

## Key Features

- **Smart Resume Parsing**: Extracts structured data (skills, experience, education, previous employers) from uploaded PDFs using python document parsers and AI extraction.
- **Strict Candidate Scoring**: Powered by `DeepSeek-V3` via Hugging Face. The engine is deliberately strict. It heavily penalizes career/domain mismatches and flags specific skill, education, and experience gaps in a detailed Skill Gap Analysis.
- **Fuzzy Duplicate Detection**: Prevents candidates from spamming the same job opening by using fuzzy name and exact email/phone matching constraints.
- **Automated Scheduling**: For candidates that pass the scoring threshold, the system automatically finds the next available Google Calendar slot, perfectly respecting a 15-minute buffer between back-to-back candidates. 
- **Email Automation**: Triggers responsive, rich HTML emails via the Gmail API to confirm applications, send calendar invites for shortlisted candidates, and politely let down poor fits.
- **Dynamic Interview Questions**: Automatically writes targeted technical interview questions tailored to the candidate's exact skill gaps for the interviewer to use.
- **Premium HR Dashboard**: The internal portal has a fully redesigned UI inspired by tools like Linear and Ashby — dark navy sidebar with grouped navigation, animated active states, and a glass-style user card at the bottom. Every page uses a consistent clean design system so it actually looks and feels like a real SaaS product.
- **Kanban Pipeline View**: Candidates move through hiring stages on a visual Kanban board. Each card shows the AI match score, skill chips, experience, and quick-action buttons so recruiters can shortlist, reject, or schedule an interview right from the board without digging through a table.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS
- **Backend**: Python, FastAPI
- **Database**: Supabase (Postgres)
- **AI & Inference**: Hugging Face Inference API (`DeepSeek-V3`) as the primary workhorse, with a fallback to `Gemini 2.5 Flash`.
- **Integrations**: Google Calendar API & Gmail API (via OAuth), RapidFuzz for fuzzy string matching.

## Local Setup

### 1. Database Configuration
1. Spin up a new Supabase project.
2. Run the provided database schema found at `supabase/schema.sql` in your Supabase SQL editor.

### 2. Environment Variables
Copy `.env.example` to `.env` in the root of the project and fill in the required keys, including:
- Your Supabase URLs and keys.
- Hugging Face and/or Gemini API tokens.
- Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`). Make sure your OAuth scopes include `gmail.send` and `calendar.events`.

### 3. Run the Python Backend
We use `uv` for python package management.
```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

### 4. Run the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```