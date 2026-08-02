from enum import Enum

class EmailType(str, Enum):
    APPLICATION_CONFIRMATION = "application_confirmation"
    SHORTLIST_NOTICE = "shortlist_notice"
    INTERVIEW_INVITE = "interview_invite"
    INTERVIEW_REMINDER = "interview_reminder"
    REJECTION = "rejection"
    OFFER_NOTICE = "offer_notice"
