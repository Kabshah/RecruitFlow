import os
import base64
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from notifications import EmailType
from notifications import templates as tmpl
from ats.db import SupabaseATS

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Force IPv4 socket resolution to prevent Windows IPv6 timeout (WinError 10060)
_orig_getaddrinfo = socket.getaddrinfo


def _getaddrinfo_ipv4(*args, **kwargs):
    res = _orig_getaddrinfo(*args, **kwargs)
    ipv4_res = [r for r in res if r[0] == socket.AF_INET]
    return ipv4_res if ipv4_res else res


socket.getaddrinfo = _getaddrinfo_ipv4


class GmailSender:
    """
    Sends email via the Gmail API using OAuth credentials from .env.
    Sends multipart emails (plain-text + HTML) for rich formatting.
    Falls back to a logged no-op if credentials are missing.
    """

    def __init__(self, db: SupabaseATS):
        self.db = db
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")

        if client_id and client_secret and refresh_token:
            creds = Credentials(
                token=None,
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
                token_uri="https://oauth2.googleapis.com/token",
            )
            try:
                self.service = build("gmail", "v1", credentials=creds)
            except Exception as e:
                print(f"Gmail API init failed: {e}. Running in no-op mode.")
                self.service = None
        else:
            print("Gmail OAuth credentials not set. Running in no-op email mode.")
            self.service = None

    # ──────────────────────────────────────────────────────────
    # Public method: single dispatch point for all email types
    # ──────────────────────────────────────────────────────────
    def send(
        self,
        email_type: EmailType,
        to_address: str,
        application_id: str,
        **template_kwargs,
    ) -> bool:
        template_fn = {
            EmailType.APPLICATION_CONFIRMATION: tmpl.application_confirmation,
            EmailType.SHORTLIST_NOTICE: tmpl.shortlist_notice,
            EmailType.INTERVIEW_INVITE: tmpl.interview_invite,
            EmailType.INTERVIEW_REMINDER: tmpl.interview_reminder,
            EmailType.REJECTION: tmpl.rejection,
            EmailType.OFFER_NOTICE: tmpl.offer_notice,
        }.get(email_type)

        if template_fn is None:
            raise ValueError(f"Unknown email type: {email_type}")

        content = template_fn(**template_kwargs)
        success = self._dispatch(
            to=to_address,
            subject=content["subject"],
            plain_body=content["body"],
            html_body=content.get("html"),
        )
        self._log(application_id, email_type, success)
        return success

    # ──────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────
    def _dispatch(self, to: str, subject: str, plain_body: str, html_body: str | None = None) -> bool:
        if not self.service:
            print(f"\n[EMAIL NO-OP] To: {to}\nSubject: {subject}\n---\n{plain_body}\n---\n")
            return True  # treat as success so pipeline isn't blocked during dev

        try:
            if html_body:
                msg = MIMEMultipart("alternative")
                msg["to"] = to
                msg["subject"] = subject
                msg.attach(MIMEText(plain_body, "plain", "utf-8"))
                msg.attach(MIMEText(html_body, "html", "utf-8"))
                raw_bytes = msg.as_bytes()
            else:
                simple = MIMEText(plain_body, "plain", "utf-8")
                simple["to"] = to
                simple["subject"] = subject
                raw_bytes = simple.as_bytes()

            raw = base64.urlsafe_b64encode(raw_bytes).decode()
            self.service.users().messages().send(userId="me", body={"raw": raw}).execute()
            print(f"[Gmail] Sent '{subject}' → {to}")
            return True
        except Exception as e:
            print(f"Gmail send failed: {e}")
            return False

    def _log(self, application_id: str, email_type: EmailType, success: bool) -> None:
        import datetime
        try:
            self.db.client.table("email_log").insert({
                "application_id": application_id,
                "email_type": email_type.value,
                "sent_at": datetime.datetime.utcnow().isoformat(),
                "status": "sent" if success else "failed",
            }).execute()
        except Exception as e:
            print(f"email_log insert failed: {e}")


class ResendSender:
    """
    Alternative sender using the Resend API (documented fallback).
    Swap in by replacing GmailSender with ResendSender in main.py — no other code changes.

    Note: Resend free tier can only send to your own verified address until a sending
    domain is verified — it cannot email real candidates on the free tier without that step.
    """

    def __init__(self, db: SupabaseATS):
        self.db = db
        self.api_key = os.getenv("RESEND_API_KEY")
        if not self.api_key:
            print("RESEND_API_KEY not set. ResendSender running in no-op mode.")

    def send(self, email_type: EmailType, to_address: str, application_id: str, **template_kwargs) -> bool:
        template_fn = {
            EmailType.APPLICATION_CONFIRMATION: tmpl.application_confirmation,
            EmailType.SHORTLIST_NOTICE: tmpl.shortlist_notice,
            EmailType.INTERVIEW_INVITE: tmpl.interview_invite,
            EmailType.INTERVIEW_REMINDER: tmpl.interview_reminder,
            EmailType.REJECTION: tmpl.rejection,
            EmailType.OFFER_NOTICE: tmpl.offer_notice,
        }.get(email_type)

        if template_fn is None:
            raise ValueError(f"Unknown email type: {email_type}")

        content = template_fn(**template_kwargs)
        success = self._dispatch(
            to=to_address,
            subject=content["subject"],
            plain_body=content["body"],
            html_body=content.get("html"),
        )
        self._log(application_id, email_type, success)
        return success

    def _dispatch(self, to: str, subject: str, plain_body: str, html_body: str | None = None) -> bool:
        if not self.api_key:
            print(f"\n[RESEND NO-OP] To: {to}\nSubject: {subject}\n---\n{plain_body}\n---\n")
            return True

        import urllib.request
        import json as _json

        payload = _json.dumps({
            "from": "onboarding@resend.dev",
            "to": [to],
            "subject": subject,
            "text": plain_body,
            **({"html": html_body} if html_body else {}),
        }).encode()

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status == 200
        except Exception as e:
            print(f"Resend send failed: {e}")
            return False

    def _log(self, application_id: str, email_type: EmailType, success: bool) -> None:
        import datetime
        try:
            self.db.client.table("email_log").insert({
                "application_id": application_id,
                "email_type": email_type.value,
                "sent_at": datetime.datetime.utcnow().isoformat(),
                "status": "sent" if success else "failed",
            }).execute()
        except Exception as e:
            print(f"email_log insert failed: {e}")
