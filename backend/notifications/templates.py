"""
Email templates for all pipeline stages.
Each function returns a dict with 'subject', 'body' (plain-text), and 'html' (rich HTML).
"""

_BRAND = "RecruitFlow"
_STATUS_URL = "http://localhost:3000/status"

# ── Shared HTML wrapper ────────────────────────────────────────────────────────

def _wrap_html(title: str, hero_color: str, inner_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- HEADER -->
        <tr>
          <td style="background:{hero_color};padding:32px 40px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">{_BRAND}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">AI-Powered Recruitment Platform</p>
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px;">
            {inner_html}
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              This email was sent by {_BRAND} · AI Recruitment Platform<br/>
              Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _btn(url: str, label: str, color: str = "#1d4ed8") -> str:
    return f"""<a href="{url}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:{color};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">{label}</a>"""


def _divider() -> str:
    return '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />'


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">{text}</p>'


def _h2(text: str) -> str:
    return f'<h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a;">{text}</h2>'


def _info_block(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;width:140px;border-bottom:1px solid #f1f5f9;">{label}</td>
      <td style="padding:8px 12px;font-size:14px;color:#1e293b;font-weight:700;border-bottom:1px solid #f1f5f9;">{value}</td>
    </tr>"""


# ── Templates ─────────────────────────────────────────────────────────────────

def application_confirmation(candidate_name: str, job_title: str, reference_code: str) -> dict:
    subject = f"Application received — {job_title} | Ref: {reference_code}"
    plain = f"""Hi {candidate_name},

Thank you for applying for the {job_title} role at {_BRAND}.

Your application is under review. Your reference code is: {reference_code}

Track your status at: {_STATUS_URL}

Best regards,
{_BRAND}"""

    inner = f"""
{_h2(f"Application Received ✓")}
{_p(f"Hi <strong>{candidate_name}</strong>, thank you for applying for the <strong>{job_title}</strong> role. Your application has been received and our AI screening is underway.")}
{_divider()}
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:20px;">
  <tbody>
    {_info_block("Reference Code", f"<span style='font-family:monospace;background:#e0e7ff;padding:2px 8px;border-radius:4px;color:#3730a3;'>{reference_code}</span>")}
    {_info_block("Role", job_title)}
    {_info_block("Status", "Under Review")}
  </tbody>
</table>
{_p("You can check your application status at any time using your reference code and email address:")}
{_btn(_STATUS_URL, "Check My Status →")}
{_divider()}
{_p("We'll notify you as soon as we have an update. Good luck! 🚀")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#1d4ed8", inner)}


def shortlist_notice(candidate_name: str, job_title: str, reference_code: str = "") -> dict:
    subject = f"Great news — you've been shortlisted for {job_title}"
    plain = f"""Hi {candidate_name},

We're pleased to let you know that your application for the {job_title} role has been reviewed and you have been shortlisted!

Our team will be in touch shortly to arrange the next steps.

Best regards,
{_BRAND}"""

    inner = f"""
{_h2("You've Been Shortlisted! 🎉")}
{_p(f"Hi <strong>{candidate_name}</strong>, we're excited to share that your application for the <strong>{job_title}</strong> role stood out to our team.")}
{_divider()}
{f"<p style='font-size:13px;color:#64748b;margin:0 0 16px'>Application Tracker ID: <span style='font-family:monospace;background:#e2e8f0;padding:2px 6px;border-radius:4px;'>{reference_code}</span></p>" if reference_code else ""}
{_p("You have been shortlisted and will be contacted shortly to schedule an interview. Well done!")}
{_p("Please keep an eye on your inbox for the next steps.")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#0369a1", inner)}


def interview_invite(
    candidate_name: str,
    job_title: str,
    datetime_str: str,
    calendar_link: str,
    duration_minutes: int = 60,
    meeting_notes: str = "",
    reference_code: str = "",
) -> dict:
    subject = f"Interview Invitation — {job_title} at {_BRAND}"
    plain = f"""Hi {candidate_name},

Congratulations! We'd like to invite you to an interview for the {job_title} role.

Date & Time: {datetime_str}
Duration: {duration_minutes} minutes
Calendar Link: {calendar_link}

{f"Notes: {meeting_notes}" if meeting_notes else ""}

Please confirm your attendance by replying to this email. If you need to reschedule, let us know as soon as possible.

Best of luck!
{_BRAND}"""

    meeting_notes_block = ""
    if meeting_notes:
        meeting_notes_block = f"""
{_divider()}
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Notes</p>
{_p(meeting_notes)}"""

    inner = f"""
{_h2("Interview Invitation 📅")}
{_p(f"Hi <strong>{candidate_name}</strong>, congratulations! We'd like to invite you to an interview for the <strong>{job_title}</strong> role at {_BRAND}.")}
{_divider()}
<table cellpadding="0" cellspacing="0" width="100%" style="background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;margin-bottom:20px;">
  <tbody>
    {_info_block("📅 Date & Time", f"<span style='color:#1d4ed8;'>{datetime_str}</span>")}
    {_info_block("⏱️ Duration", f"{duration_minutes} minutes")}
    {_info_block("📋 Role", job_title)}
    {_info_block("🏷️ Tracker ID", f"<span style='font-family:monospace;'>{reference_code}</span>") if reference_code else ""}
  </tbody>
</table>
{_p("Click the button below to view this event in Google Calendar:")}
{_btn(calendar_link, "View in Google Calendar 📅", "#1d4ed8")}
{meeting_notes_block}
{_divider()}
{_p("Please reply to this email to confirm your attendance, or let us know if you need to reschedule.")}
{_p("We look forward to meeting you! Good luck 🌟")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#1d4ed8", inner)}


def interview_reminder(candidate_name: str, job_title: str, datetime_str: str) -> dict:
    subject = f"Reminder: Your interview tomorrow — {job_title}"
    plain = f"""Hi {candidate_name},

This is a friendly reminder that your interview for the {job_title} role is scheduled for:

  {datetime_str}

Please ensure you are ready on time. Good luck!

Best regards,
{_BRAND}"""

    inner = f"""
{_h2("Interview Reminder ⏰")}
{_p(f"Hi <strong>{candidate_name}</strong>, this is a friendly reminder that your interview for the <strong>{job_title}</strong> role is coming up soon.")}
{_divider()}
<table cellpadding="0" cellspacing="0" width="100%" style="background:#fefce8;border-radius:10px;border:1px solid #fde68a;margin-bottom:20px;">
  <tbody>
    {_info_block("📅 Scheduled For", f"<span style='color:#92400e;font-weight:800;'>{datetime_str}</span>")}
    {_info_block("📋 Role", job_title)}
  </tbody>
</table>
{_p("Make sure you're prepared and ready to go. We're looking forward to speaking with you!")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#d97706", inner)}


def rejection(candidate_name: str, job_title: str, reference_code: str = "") -> dict:
    subject = f"Your application for {job_title} — Update"
    plain = f"""Hi {candidate_name},

Thank you for your interest in the {job_title} role at {_BRAND} and for the time you invested in your application.

After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.

We appreciate your interest and encourage you to apply for future opportunities with us.

Best regards,
{_BRAND}"""

    inner = f"""
{_h2("Application Update")}
{_p(f"Hi <strong>{candidate_name}</strong>, thank you for applying for the <strong>{job_title}</strong> role and for the time and effort you put into your application.")}
{_divider()}
{f"<p style='font-size:13px;color:#64748b;margin:0 0 16px'>Application Tracker ID: <span style='font-family:monospace;background:#e2e8f0;padding:2px 6px;border-radius:4px;'>{reference_code}</span></p>" if reference_code else ""}
{_p("After careful consideration, we're sorry to inform you that we will not be moving forward with your application at this time.")}
{_p("We genuinely appreciate your interest in {_BRAND} and encourage you to keep an eye on future opportunities that may be a great fit for your skills.")}
{_p("We wish you the very best in your career journey. 💙")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#64748b", inner)}


def offer_notice(candidate_name: str, job_title: str) -> dict:
    subject = f"Offer of Employment — {job_title} | {_BRAND}"
    plain = f"""Hi {candidate_name},

We are thrilled to offer you the position of {job_title} at {_BRAND}!

Our HR team will be sending through a formal offer letter with all the details shortly. We look forward to welcoming you to the team!

Best regards,
{_BRAND}"""

    inner = f"""
{_h2("Congratulations — You Got the Offer! 🎊")}
{_p(f"Hi <strong>{candidate_name}</strong>, we are absolutely thrilled to offer you the position of <strong>{job_title}</strong> at {_BRAND}!")}
{_divider()}
{_p("Our HR team will be in touch very shortly with a formal offer letter containing all the details including start date, compensation, and onboarding information.")}
{_p("We can't wait to welcome you to the team. Congratulations once again! 🌟")}"""

    return {"subject": subject, "body": plain, "html": _wrap_html(subject, "#059669", inner)}
