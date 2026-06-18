"""Transactional email via the Resend HTTP API (shared stephens.page sender).

Sends are best-effort and meant to be called from FastAPI BackgroundTasks so the
request returns immediately. Email bodies use a small warm "Dawn Nursery" shell.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

# In production the key is injected from the shared SOPS store as SMTP_PASS
# (/etc/shared-secrets/smtp.env.sops via secret-env). RESEND_API_KEY is a local-dev
# fallback. Rotate with: rotate-secret smtp
RESEND_API_KEY = os.environ.get("SMTP_PASS") or os.environ.get("RESEND_API_KEY", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "Little One <noreply@stephens.page>")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "jacob@stephens.page")


def send_email(to: str, subject: str, html: str) -> bool:
    payload = json.dumps({"from": MAIL_FROM, "to": [to], "subject": subject, "html": html}).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            # Resend's API sits behind Cloudflare, which blocks the default
            # python-urllib agent (error 1010); send a normal UA.
            "User-Agent": "baby.stephens.page/1.0 (+https://baby.stephens.page)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 300
    except urllib.error.HTTPError as e:
        print("resend HTTPError", e.code, e.read()[:300])
    except Exception as e:  # noqa: BLE001 - email is best-effort
        print("resend error", repr(e))
    return False


def _shell(heading: str, body_html: str, button_label: str | None = None, button_url: str | None = None) -> str:
    button = ""
    if button_label and button_url:
        button = (
            f'<a href="{button_url}" style="display:inline-block;background:#cd7351;color:#fff;'
            f'text-decoration:none;font-weight:700;padding:14px 26px;border-radius:14px;margin:8px 0 4px">'
            f"{button_label}</a>"
        )
    return f"""\
<div style="background:#fbf3e7;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fffdf8;border:1px solid #ece0cf;border-radius:24px;padding:32px 28px;color:#2f2823">
    <div style="font-size:22px;font-weight:700;color:#cd7351;margin-bottom:6px">Little One</div>
    <h1 style="font-size:22px;margin:8px 0 14px;color:#2f2823">{heading}</h1>
    <div style="font-size:15px;line-height:1.6;color:#4a4038">{body_html}</div>
    {button}
    <p style="font-size:12px;color:#a99c8d;margin-top:24px">baby.stephens.page - a private pregnancy &amp; baby tracker.</p>
  </div>
</div>"""


def send_verify_email(to: str, name: str, link: str) -> None:
    send_email(to, "Confirm your email for Little One", _shell(
        f"Welcome, {name or 'there'}!",
        "<p>Confirm your email to start tracking. This link expires in 2 days.</p>",
        "Confirm email", link))


def send_reset_email(to: str, name: str, link: str) -> None:
    send_email(to, "Reset your Little One password", _shell(
        "Reset your password",
        "<p>Tap below to choose a new password. This link expires in 1 hour. If you didn't ask for this, you can ignore it.</p>",
        "Reset password", link))


def send_magic_email(to: str, name: str, link: str) -> None:
    send_email(to, "Your Little One sign-in link", _shell(
        "Your sign-in link",
        "<p>Tap below to sign in. This link expires in 15 minutes and only works once.</p>",
        "Sign in", link))


def send_invite_email(to: str, inviter: str, household: str, link: str) -> None:
    send_email(to, f"{inviter} invited you to {household} on Little One", _shell(
        f"Join {household}",
        f"<p><strong>{inviter}</strong> invited you to help track their little one. "
        "Tap below to set up your account. This invite expires in 7 days.</p>",
        "Accept invite", link))


def send_admin_notify(email: str, household: str | None) -> None:
    send_email(ADMIN_EMAIL, "New Little One account",
               _shell("New account created",
                      f"<p>A new account was created:</p><p><strong>{email}</strong><br>"
                      f"Household: {household or '(default)'}</p>"))
