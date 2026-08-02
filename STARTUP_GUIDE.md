# RecruitFlow AI - Quick Start Guide

Since this infrastructure is separated into a Next.js frontend, a Python FastAPI backend, a Supabase Database setup, and an n8n orchestration instance, you will need to start a few local web servers simultaneously to view the whole end-to-end flow.

## 1. Supabase (Database) Setup First
The entire application depends on Supabase as its central state and truth.
1. Go to [Supabase](https://supabase.com) and create a free project.
2. Go to **Project Settings > API** to find your `Project URL`, `anon / public API key`, and your `service_role secret API key`.
3. Open `e:\RecruitFlow\.env.example`, rename it to `.env`, and fill those credentials in. Also supply your `GEMINI_API_KEY`.
4. Run the SQL script located at `e:\RecruitFlow\supabase\schema.sql` within your Supabase project's SQL Editor to set up the necessary tables.

## 2. Setting Up the Frontend
The Next.js frontend powers both the Public Careers Page and the Internal HR Portal.
1. Make sure you are in the `frontend` directory.
2. In your `.env.local` inside the frontend folder, you must define:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Run the development server:
   ```bash
   cd e:\RecruitFlow\frontend
   npm run dev
   ```
4. Access the public portal at [http://localhost:3000](http://localhost:3000) and the HR portal at [http://localhost:3000/jobs](http://localhost:3000/jobs).

## 3. Launching the Backend (AI Engine)
The Python backend handles resume text extraction, OCR, LLM structured formatting, grading, and duplicate checking.
1. Navigate into the backend folder, ensuring that `uv` uses your virtual environment implicitly:
   ```bash
   cd e:\RecruitFlow\backend
   ```
2. Start the FastAPI server (it resolves imports natively from the root):
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```
3. The backend APIs will be exposed on [http://localhost:8000/intake](http://localhost:8000/intake) and `.../evaluate`.

## 4. Seeding Test Data
If you visit the frontend, you'll see "No open roles". Insert your baseline synthetic data so it has something to render!
Make sure your Supabase keys are in your `.env` file within `e:\RecruitFlow\`, then run:
```bash
cd e:\RecruitFlow
backend\.venv\Scripts\python seed\seed.py
```
Refresh your frontend at `http://localhost:3000/careers` and you should see the `Software Engineer (Backend)` job posted!

## 5. Starting n8n orchestration
The final piece in Phase 1-3 is the n8n orchestrator that glues the frontend `.pdf` form submissions over to the backend engine logically over Webhooks.
1. Ensure your Docker Desktop is running.
2. Boot up n8n natively using the provided Compose file:
   ```bash
   cd e:\RecruitFlow
   docker compose up -d
   ```
3. Visit [http://localhost:5678](http://localhost:5678) to set up your admin profile and start configuring the webhook visual graphs to connect your APIs!

---
*Note on Phase 4:* To be prepared for the Google Calendar Automation, ensure your Google Cloud project is verified to "**In production**" and you've populated your `.env` with a non-expiring specific `GOOGLE_REFRESH_TOKEN` for the calendar scripts!
