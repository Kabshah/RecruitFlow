import os
import datetime
from zoneinfo import ZoneInfo
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from scheduling.timezone_rules import resolve_location


SLOT_DURATION_MINUTES = 60
BUFFER_MINUTES = 15


class CalendarManager:
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
        # Default timezone — used when no job location is provided
        self.default_timezone = os.getenv("DEFAULT_TIMEZONE", "Australia/Sydney")

        if not self.refresh_token:
            self.service = None
            print("Warning: GOOGLE_REFRESH_TOKEN not set. Running in dummy Calendar mode.")
        else:
            try:
                creds = Credentials(
                    token=None,
                    refresh_token=self.refresh_token,
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    token_uri="https://oauth2.googleapis.com/token"
                )
                self.service = build('calendar', 'v3', credentials=creds)
            except Exception as e:
                print(f"Failed to initialize Google Calendar API: {e}")
                self.service = None

    # ── Public API ────────────────────────────────────────────────────────────

    def find_available_slots(
        self,
        days_ahead: int = 7,
        booked_datetimes: list[str] | None = None,
        job_location: str | None = None,
    ) -> list:
        """
        Returns available 60-min slots with 15-min buffer between consecutive
        interviews for a specific job location.

        Scheduling rules:
          • Mon–Fri only inside the office's local working hours.
          • Slots are ONLY scheduled post-lunch (lunch_end → work_end).
            E.g. for Pakistan (lunch 13–14, work 9–17) slots run 14:00–17:00.
          • Both Google Calendar events and already-booked interview_datetime
            values from Supabase are treated as occupied.
        """
        hours = resolve_location(job_location, fallback_tz=self.default_timezone)
        tz = ZoneInfo(hours["timezone"])
        now = datetime.datetime.now(tz)

        start_date = now + datetime.timedelta(days=1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + datetime.timedelta(days=days_ahead)

        google_events: list = []
        if self.service:
            try:
                events_result = self.service.events().list(
                    calendarId='primary',
                    timeMin=start_date.isoformat(),
                    timeMax=end_date.isoformat(),
                    singleEvents=True,
                    orderBy='startTime'
                ).execute()
                google_events = events_result.get('items', [])
            except Exception as e:
                print(f"Failed to fetch Google Calendar events: {e}")

        return self._calculate_slots(
            start_date=start_date,
            days_ahead=days_ahead,
            google_events=google_events,
            tz=tz,
            booked_datetimes=booked_datetimes or [],
            work_start=hours["work_start"],
            work_end=hours["work_end"],
            lunch_end=hours["lunch_end"],
        )

    def find_next_available_slot(
        self,
        booked_datetimes: list[str],
        days_ahead: int = 14,
        job_location: str | None = None,
    ) -> dict | None:
        """
        Returns the earliest single available slot for the given job location,
        respecting that location's timezone, office hours, and lunch window.
        """
        slots = self.find_available_slots(
            days_ahead=days_ahead,
            booked_datetimes=booked_datetimes,
            job_location=job_location,
        )
        return slots[0] if slots else None

    def create_interview_event(
        self,
        candidate_name: str,
        candidate_email: str,
        start_iso: str,
        end_iso: str,
        job_title: str = "the role",
        job_location: str | None = None,
    ) -> str:
        """Creates a Google Calendar event and returns the event HTML link."""
        hours = resolve_location(job_location, fallback_tz=self.default_timezone)
        event_tz = hours["timezone"]

        if not self.service:
            print("Google Calendar not configured. Returning dummy URL.")
            return "https://calendar.google.com/calendar/r"

        event = {
            'summary': f'Interview: {candidate_name} — {job_title}',
            'description': (
                f'Automated interview scheduled via RecruitFlow AI.\n\n'
                f'Candidate: {candidate_name}\n'
                f'Role: {job_title}\n'
                f'Location: {job_location or "Not specified"}\n'
                f'Duration: 60 minutes'
            ),
            'start': {'dateTime': start_iso, 'timeZone': event_tz},
            'end': {'dateTime': end_iso, 'timeZone': event_tz},
            'attendees': [{'email': candidate_email}],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},
                    {'method': 'popup', 'minutes': 30},
                ],
            },
        }

        try:
            created_event = self.service.events().insert(
                calendarId='primary',
                body=event,
                sendUpdates='all',
            ).execute()
            return created_event.get('htmlLink', '')
        except Exception as e:
            print(f"Failed to create Google Calendar event: {e}")
            return ""

    # ── Private helpers ───────────────────────────────────────────────────────

    def _calculate_slots(
        self,
        start_date: datetime.datetime,
        days_ahead: int,
        google_events: list,
        tz: ZoneInfo,
        booked_datetimes: list[str],
        work_start: int,
        work_end: int,
        lunch_end: int,
    ) -> list:
        """
        Core slot-finder.

        Post-lunch rule: interview slots begin at `lunch_end` (e.g. 14:00 for
        Pakistan) and run until `work_end - 1 hour` so no slot overruns close
        of business.  Slots before lunch are intentionally excluded.
        """
        slot_duration = datetime.timedelta(minutes=SLOT_DURATION_MINUTES)
        buffer = datetime.timedelta(minutes=BUFFER_MINUTES)

        # Build occupied windows from Google Calendar events
        occupied: list[tuple[datetime.datetime, datetime.datetime]] = []
        for e in google_events:
            if 'dateTime' in e.get('start', {}):
                e_start = datetime.datetime.fromisoformat(e['start']['dateTime']).astimezone(tz)
                e_end = datetime.datetime.fromisoformat(e['end']['dateTime']).astimezone(tz)
                occupied.append((e_start, e_end + buffer))

        # Add already-booked interview slots from our own DB (with buffer)
        for dt_str in booked_datetimes:
            try:
                dt = datetime.datetime.fromisoformat(dt_str).astimezone(tz)
                occupied.append((dt, dt + slot_duration + buffer))
            except Exception:
                pass

        slots = []
        for d in range(days_ahead):
            current_day = start_date + datetime.timedelta(days=d)
            if current_day.weekday() > 4:  # Skip Sat/Sun
                continue

            # Post-lunch slot window: lunch_end → work_end
            # Ensure no slot overruns the end of the working day
            post_lunch_start = current_day.replace(hour=lunch_end, minute=0, second=0, microsecond=0)
            end_of_day = current_day.replace(hour=work_end, minute=0, second=0, microsecond=0)

            current_time = post_lunch_start

            while current_time + slot_duration <= end_of_day:
                slot_end = current_time + slot_duration

                conflict = any(
                    current_time < occ_end and slot_end > occ_start
                    for occ_start, occ_end in occupied
                )

                if not conflict:
                    slots.append({
                        "start": current_time.isoformat(),
                        "end": slot_end.isoformat(),
                        "label": current_time.strftime("%A, %d %b %Y at %I:%M %p %Z"),
                        "timezone": str(tz),
                        "location": None,   # filled in by callers that know the job location
                    })

                current_time += slot_duration + buffer

                if len(slots) >= 10:
                    return slots

        return slots
