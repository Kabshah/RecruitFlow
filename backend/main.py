from dotenv import load_dotenv
load_dotenv(dotenv_path=str(__import__('pathlib').Path(__file__).parent.parent / '.env'))

import datetime
import os
import tempfile
import urllib.request
from zoneinfo import ZoneInfo

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ats.db import SupabaseATS
from ats.duplicate_check import DuplicateDetector
from extraction.gemini_extractor import CandidateExtractor
from llm.client import LLMClient
from notifications import EmailType
from notifications.sender import GmailSender
from parsing.document_parser import DocumentParser
from scheduling.calendar import CalendarManager
from scoring.question_generator import InterviewQuestionGenerator
from scoring.scorer import CandidateScorer

app = FastAPI(title="RecruitFlow AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Service initialisation ────────────────────────────────────────────────────

try:
    llm_client = LLMClient()
    extractor = CandidateExtractor(llm_client)
    parser = DocumentParser()
    db = SupabaseATS()
    scorer = CandidateScorer(llm_client)
    duplicate_detector = DuplicateDetector(db)
    question_generator = InterviewQuestionGenerator(llm_client)
    calendar = CalendarManager()
    mailer = GmailSender(db)
    print("[Boot] All backend services initialized successfully.")
except Exception as e:
    print(f"[Boot] FAILED to initialize services: {e}")
    llm_client = extractor = parser = db = scorer = duplicate_detector = \
        question_generator = calendar = mailer = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_post_score_pipeline(
    *,
    application_id: str,
    candidate_id: str,
    candidate_name: str,
    candidate_email: str,
    candidate_profile: dict,
    score_val: int,
    classification: str,
    job_title: str,
    job_data: dict,
    skill_gap: dict | None,
    reference_code: str | None,
) -> None:
    """
    Runs everything that happens *after* a score is produced:
      1. Send confirmation / shortlist / rejection email
      2. If score >= 60: find next available calendar slot (with 15-min buffer),
         create the Google Calendar event, send interview invite email,
         update applications.interview_datetime in the DB.
      3. Generate & store interview questions if shortlisted.
    Never raises — failures are logged so they don't break the API response.

    Scheduling is location-aware: slots are chosen in the timezone of the job's
    office and are restricted to post-lunch hours (see scheduling/timezone_rules.py).
    """
    # Resolve the display timezone for the confirmation message only.
    # Actual slot timezone is resolved inside CalendarManager from job_location.
    job_location: str | None = job_data.get("location")
    tz = ZoneInfo(os.getenv("DEFAULT_TIMEZONE", "Australia/Sydney"))

    # ── Email: shortlist notice or rejection ──────────────────────────────────
    if mailer:
        try:
            if score_val >= 60:
                mailer.send(
                    email_type=EmailType.SHORTLIST_NOTICE,
                    to_address=candidate_email,
                    application_id=application_id,
                    candidate_name=candidate_name,
                    job_title=job_title,
                    reference_code=reference_code,
                )
                print(f"[Email] Shortlist notice → {candidate_email}")
            else:
                mailer.send(
                    email_type=EmailType.REJECTION,
                    to_address=candidate_email,
                    application_id=application_id,
                    candidate_name=candidate_name,
                    job_title=job_title,
                    reference_code=reference_code,
                )
                print(f"[Email] Rejection notice → {candidate_email}")
        except Exception as e:
            print(f"[Email] send failed (non-fatal): {e}")

    if score_val < 60:
        return  # Nothing else to do for rejected candidates

    # ── Interview scheduling ──────────────────────────────────────────────────
    slot = None
    calendar_link = ""
    formatted_dt = ""
    interview_dt_str: str | None = None

    try:
        booked = db.get_booked_interview_slots() if db else []
        slot = (
            calendar.find_next_available_slot(
                booked_datetimes=booked,
                job_location=job_location,
            )
            if calendar else None
        )

        if slot:
            start_iso = slot["start"]
            end_iso = slot["end"]
            formatted_dt = slot["label"]
            interview_dt_str = start_iso

            # Create Google Calendar event in the job's local timezone
            calendar_link = calendar.create_interview_event(
                candidate_name=candidate_name,
                candidate_email=candidate_email,
                start_iso=start_iso,
                end_iso=end_iso,
                job_title=job_title,
                job_location=job_location,
            )

            # Persist scheduled slot to the applications record
            db.client.table('applications').update({
                "interview_datetime": start_iso,
                "application_stage": "Interviewing",
                "updated_at": datetime.datetime.utcnow().isoformat(),
            }).eq('id', application_id).execute()

            print(f"[Calendar] Interview slot booked: {formatted_dt} for {candidate_name}")
        else:
            print(f"[Calendar] No available slots found for {candidate_name} — skipping calendar booking")
    except Exception as e:
        print(f"[Calendar] scheduling failed (non-fatal): {e}")

    # ── Email: interview invite ───────────────────────────────────────────────
    if mailer and slot:
        try:
            mailer.send(
                email_type=EmailType.INTERVIEW_INVITE,
                to_address=candidate_email,
                application_id=application_id,
                candidate_name=candidate_name,
                job_title=job_title,
                datetime_str=formatted_dt,
                calendar_link=calendar_link or "https://calendar.google.com/calendar/r",
                duration_minutes=60,
                reference_code=reference_code,
            )
            print(f"[Email] Interview invite → {candidate_email} for {formatted_dt}")
        except Exception as e:
            print(f"[Email] interview invite failed (non-fatal): {e}")

    # ── Interview question generation ─────────────────────────────────────────
    if question_generator and db and score_val >= 60:
        try:
            questions = question_generator.generate(
                job_description=job_data.get('description', ''),
                candidate_profile=candidate_profile,
                gap_analysis=skill_gap or {},
            )
            db.client.table('interview_questions').insert({
                "application_id": application_id,
                "questions_json": questions,
            }).execute()
            print(f"[Questions] {len(questions)} interview questions generated for application {application_id}")
        except Exception as e:
            print(f"[Questions] question generation failed (non-fatal): {e}")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "message": "RecruitFlow Backend is running"}


@app.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database service not initialized")
    try:
        db.delete_candidate(candidate_id)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ProcessRequest(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    resume_file_url: str
    job_opening_id: str | None = None
    reference_code: str | None = None


@app.post("/process")
async def process_application(req: ProcessRequest):
    """
    Core pipeline entry point — called directly by the Next.js API route when a
    candidate submits the apply form (no n8n involvement).

    Flow: download resume → parse → extract fields → duplicate check → score →
          write to Supabase → send emails → schedule calendar slot → generate questions.
    """
    if not extractor or not parser or not scorer or not db:
        raise HTTPException(status_code=500, detail="Backend services not properly initialized")

    ext = os.path.splitext(req.resume_file_url.split("?")[0])[-1].lower() or ".pdf"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            urllib.request.urlretrieve(req.resume_file_url, tmp.name)
            tmp_path = tmp.name

        # 1. Parse resume text
        text = parser.extract_text(tmp_path)
        db.client.table('candidates').update({"raw_resume_text": text}).eq('id', req.candidate_id).execute()

        # 2. Extract structured candidate profile
        candidate_json = extractor.extract_from_resume(text)
        # Merge in form-submitted fields so we always have email/name even if LLM misses them
        candidate_json.setdefault("email", req.candidate_email)
        candidate_json.setdefault("name", req.candidate_name)

        score_val: int = 0
        classification = "Not Evaluated"
        explanation = ""
        skill_gap: dict | None = None
        job_title = "the role"
        job_data: dict = {}

        if req.job_opening_id:
            res = db.client.table('job_openings').select('*').eq('id', req.job_opening_id).execute()
            job_data = res.data[0] if getattr(res, 'data', None) else {}

            if job_data:
                job_title = job_data.get('title', 'the role')

                # 3. Duplicate detection (scoped to this job opening)
                dup_result = duplicate_detector.check_duplicate(candidate_json, req.job_opening_id)
                if dup_result.get("is_duplicate") and req.application_id:
                    db.client.table('applications').update({
                        "is_duplicate_of": dup_result.get("original_application_id")
                    }).eq('id', req.application_id).execute()

                # 4. Score + skill gap
                evaluation = scorer.evaluate_candidate(candidate_json, job_data)
                score_val = evaluation["score"]
                classification = evaluation["classification"]
                explanation = evaluation.get("explanation", "")
                skill_gap = evaluation.get("skill_gap")

                new_stage = "Shortlisted" if score_val >= 60 else "Not Selected"

                # 5. Write score & stage to DB
                db.client.table('applications').update({
                    "score": score_val,
                    "classification": classification,
                    "score_explanation": explanation,
                    "skill_gap_json": skill_gap,
                    "application_stage": new_stage,
                    "updated_at": datetime.datetime.utcnow().isoformat(),
                }).eq('id', req.application_id).execute()

        # 6. Send confirmation email (always)
        if mailer and req.reference_code:
            try:
                mailer.send(
                    email_type=EmailType.APPLICATION_CONFIRMATION,
                    to_address=req.candidate_email,
                    application_id=req.application_id,
                    candidate_name=req.candidate_name,
                    job_title=job_title,
                    reference_code=req.reference_code,
                )
                print(f"[Email] Confirmation → {req.candidate_email}")
            except Exception as e:
                print(f"[Email] confirmation failed (non-fatal): {e}")

        # 7. Post-score actions (shortlist/rejection email, scheduling, questions)
        if req.job_opening_id and job_data:
            _run_post_score_pipeline(
                application_id=req.application_id,
                candidate_id=req.candidate_id,
                candidate_name=req.candidate_name,
                candidate_email=req.candidate_email,
                candidate_profile=candidate_json,
                score_val=score_val,
                classification=classification,
                job_title=job_title,
                job_data=job_data,
                skill_gap=skill_gap,
                reference_code=req.reference_code,
            )

        return {
            "status": "success",
            "application_id": req.application_id,
            "candidate_id": req.candidate_id,
            "candidate_name": req.candidate_name,
            "candidate_email": req.candidate_email,
            "score": score_val,
            "classification": classification,
            "explanation": explanation,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


@app.post("/intake")
async def process_intake(file: UploadFile = File(...)):
    """
    Standalone intake endpoint: parses a resume file and returns extracted structured JSON.
    Can be called independently; does not write to the DB.
    """
    if not extractor or not parser:
        raise HTTPException(status_code=500, detail="Backend services not properly initialized")

    filename = file.filename if file.filename else "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        text = parser.extract_text(temp_path)
        candidate_json = extractor.extract_from_resume(text)
        return {"status": "success", "raw_text": text, "candidate_json": candidate_json}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


class EvaluateRequest(BaseModel):
    candidate_profile: dict
    job_opening_id: str
    application_id: str | None = None


@app.post("/evaluate")
async def evaluate_candidate(req: EvaluateRequest):
    """Scores a candidate profile against a job opening and writes results to the DB."""
    if not scorer or not duplicate_detector or not db:
        raise HTTPException(status_code=500, detail="Backend services not properly initialized")

    try:
        dup_result = duplicate_detector.check_duplicate(req.candidate_profile, req.job_opening_id)
        if dup_result.get("is_duplicate") and req.application_id:
            db.client.table('applications').update({
                "is_duplicate_of": dup_result.get("original_application_id")
            }).eq('id', req.application_id).execute()

        response = db.client.table('job_openings').select('*').eq('id', req.job_opening_id).execute()
        job_data = response.data[0] if getattr(response, 'data', None) else None

        if not job_data:
            raise ValueError("Job opening not found")

        evaluation = scorer.evaluate_candidate(req.candidate_profile, job_data)

        if req.application_id:
            db.client.table('applications').update({
                "score": evaluation["score"],
                "classification": evaluation["classification"],
                "score_explanation": evaluation.get("explanation", ""),
                "skill_gap_json": evaluation.get("skill_gap"),
                "application_stage": "Scoring Complete",
            }).eq('id', req.application_id).execute()

        return {
            "status": "success",
            "application_id": req.application_id,
            "duplicate_check": dup_result,
            "evaluation": evaluation,
            "score": evaluation["score"],
            "candidate_email": req.candidate_profile.get("email", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateScoreRequest(BaseModel):
    application_id: str
    score: int
    classification: str
    explanation: str = ""
    skill_gap_json: dict | None = None


@app.post("/update-score")
async def update_score(req: UpdateScoreRequest):
    """Writes an evaluated score back to Supabase (used by external callers)."""
    if not db:
        raise HTTPException(status_code=500, detail="Backend services not properly initialized")
    try:
        db.client.table('applications').update({
            "score": req.score,
            "classification": req.classification,
            "score_explanation": req.explanation,
            "skill_gap_json": req.skill_gap_json,
            "application_stage": "Scoring Complete",
        }).eq('id', req.application_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EventRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    start_iso: str
    end_iso: str
    job_title: str = "the role"


@app.post("/schedule")
async def schedule_interview(req: EventRequest):
    """Creates a Google Calendar event for an interview slot."""
    link = calendar.create_interview_event(
        req.candidate_name, req.candidate_email, req.start_iso, req.end_iso, req.job_title
    ) if calendar else "https://calendar.google.com/calendar/r"
    return {"status": "success", "event_link": link}


class QuestionsRequest(BaseModel):
    job_description: str
    candidate_profile: dict
    gap_analysis: dict


@app.post("/generate_questions")
async def generate_questions(req: QuestionsRequest):
    if not question_generator:
        raise HTTPException(status_code=500, detail="Question Generator not initialized")
    questions = question_generator.generate(req.job_description, req.candidate_profile, req.gap_analysis)
    return {"status": "success", "questions": questions}


@app.get("/slots")
async def get_slots(days: int = 7, location: str | None = None):
    """
    Returns available post-lunch interview slots for a given job location.
    Query params:
      days     — how many days ahead to search (default 7)
      location — job location string, e.g. "Karachi, Pakistan" (optional;
                 falls back to DEFAULT_TIMEZONE if omitted)
    """
    if not calendar:
        raise HTTPException(status_code=500, detail="Calendar not initialized")
    booked = db.get_booked_interview_slots() if db else []
    return {
        "status": "success",
        "slots": calendar.find_available_slots(
            days_ahead=days,
            booked_datetimes=booked,
            job_location=location,
        ),
    }


class SendEmailRequest(BaseModel):
    email_type: str
    to_address: str
    application_id: str
    template_kwargs: dict


@app.post("/send_email")
async def send_email(req: SendEmailRequest):
    """
    Sends an email for an application stage transition.
    email_type: application_confirmation | shortlist_notice | interview_invite |
                interview_reminder | rejection | offer_notice
    template_kwargs: key/value pairs matching the chosen template's signature.
    """
    if not mailer or not db:
        raise HTTPException(status_code=500, detail="Email service not initialized")
    try:
        email_type = EmailType(req.email_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid email_type '{req.email_type}'. Valid: {[e.value for e in EmailType]}",
        )
    try:
        success = mailer.send(
            email_type=email_type,
            to_address=req.to_address,
            application_id=req.application_id,
            **req.template_kwargs,
        )
        return {"status": "success" if success else "failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
