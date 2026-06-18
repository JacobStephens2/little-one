"""Accounts: registration, email verification, login, password reset,
magic-link sign-in, and household invites. Sessions are a signed token delivered
as an httpOnly cookie (web) and also returned in the body for bearer clients
(future native apps). Email links are one-time, hashed at rest, and expiring."""
from __future__ import annotations

import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

import db
import mailer
from security import (
    SESSION_MAX_AGE, hash_password, make_session, new_token, read_session,
    token_hash, verify_password,
)

BASE_URL = mailer.os.environ.get("BASE_URL", "https://baby.stephens.page")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/api/auth", tags=["auth"])
me_router = APIRouter(prefix="/api", tags=["account"])


# ---- helpers ---------------------------------------------------------------

def set_session_cookie(resp: Response, token: str) -> None:
    resp.set_cookie("session", token, max_age=SESSION_MAX_AGE, httponly=True,
                    secure=True, samesite="lax", path="/")


def _bearer_or_cookie(request: Request) -> str | None:
    tok = request.cookies.get("session")
    if not tok:
        h = request.headers.get("authorization", "")
        if h.lower().startswith("bearer "):
            tok = h[7:].strip()
    return tok


def current_user(request: Request) -> dict:
    """Auth dependency. Accepts the session via httpOnly cookie OR Bearer header."""
    tok = _bearer_or_cookie(request)
    if not tok:
        raise HTTPException(status_code=401, detail="not signed in")
    data = read_session(tok)
    if not data:
        raise HTTPException(status_code=401, detail="invalid session")
    with db.pool.connection() as c:
        row = c.execute("SELECT * FROM users WHERE id = %s", (data["uid"],)).fetchone()
    if not row or not row["email_verified"]:
        raise HTTPException(status_code=401, detail="account unavailable")
    return row


def public_user(u: dict) -> dict:
    return {"id": str(u["id"]), "email": u["email"], "display_name": u["display_name"],
            "role": u["role"], "household_id": str(u["household_id"])}


def _norm_email(e: str) -> str:
    e = (e or "").strip().lower()
    if not EMAIL_RE.match(e):
        raise HTTPException(status_code=422, detail="enter a valid email")
    return e


# ---- bodies ----------------------------------------------------------------

class RegisterBody(BaseModel):
    email: str
    password: str
    display_name: str
    household_name: str | None = None


class LoginBody(BaseModel):
    email: str
    password: str


class EmailBody(BaseModel):
    email: str


class ResetBody(BaseModel):
    token: str
    password: str


class AcceptBody(BaseModel):
    token: str
    password: str
    display_name: str


# ---- registration + verification ------------------------------------------

@router.post("/register")
def register(body: RegisterBody, bg: BackgroundTasks):
    email = _norm_email(body.email)
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="password must be at least 8 characters")
    name = (body.display_name or "").strip() or "Me"
    hh_name = (body.household_name or "").strip() or f"{name}'s family"
    with db.pool.connection() as c:
        if c.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email,)).fetchone():
            raise HTTPException(status_code=409, detail="an account with this email already exists")
        hid = c.execute("INSERT INTO households (name) VALUES (%s) RETURNING id", (hh_name,)).fetchone()["id"]
        uid = c.execute(
            "INSERT INTO users (household_id, email, password_hash, display_name, role, email_verified)"
            " VALUES (%s, %s, %s, %s, 'owner', false) RETURNING id",
            (hid, email, hash_password(body.password), name)).fetchone()["id"]
        c.execute("INSERT INTO settings (household_id) VALUES (%s) ON CONFLICT DO NOTHING", (hid,))
        raw = new_token()
        c.execute("INSERT INTO email_tokens (kind, email, user_id, token_hash, expires_at)"
                  " VALUES ('verify', %s, %s, %s, now() + interval '2 days')", (email, uid, token_hash(raw)))
    bg.add_task(mailer.send_verify_email, email, name, f"{BASE_URL}/api/auth/verify?token={raw}")
    bg.add_task(mailer.send_admin_notify, email, hh_name)
    return {"status": "verify_sent"}


@router.get("/verify")
def verify(token: str):
    with db.pool.connection() as c:
        row = c.execute("SELECT * FROM email_tokens WHERE token_hash = %s AND kind = 'verify'"
                        " AND used_at IS NULL AND expires_at > now()", (token_hash(token),)).fetchone()
        if not row:
            return RedirectResponse(f"{BASE_URL}/?verify=failed", status_code=302)
        c.execute("UPDATE users SET email_verified = true, updated_at = now() WHERE id = %s", (row["user_id"],))
        c.execute("UPDATE email_tokens SET used_at = now() WHERE id = %s", (row["id"],))
        u = c.execute("SELECT id, household_id FROM users WHERE id = %s", (row["user_id"],)).fetchone()
    resp = RedirectResponse(f"{BASE_URL}/?welcome=1", status_code=302)
    set_session_cookie(resp, make_session(u["id"], u["household_id"]))
    return resp


@router.post("/resend-verification")
def resend_verification(body: EmailBody, bg: BackgroundTasks):
    email = _norm_email(body.email)
    with db.pool.connection() as c:
        u = c.execute("SELECT id, display_name, email_verified FROM users WHERE lower(email) = %s", (email,)).fetchone()
        if u and not u["email_verified"]:
            raw = new_token()
            c.execute("INSERT INTO email_tokens (kind, email, user_id, token_hash, expires_at)"
                      " VALUES ('verify', %s, %s, %s, now() + interval '2 days')", (email, u["id"], token_hash(raw)))
            bg.add_task(mailer.send_verify_email, email, u["display_name"], f"{BASE_URL}/api/auth/verify?token={raw}")
    return {"status": "sent"}


# ---- login / logout --------------------------------------------------------

@router.post("/login")
def login(body: LoginBody, response: Response):
    email = (body.email or "").strip().lower()
    with db.pool.connection() as c:
        u = c.execute("SELECT * FROM users WHERE lower(email) = %s", (email,)).fetchone()
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="wrong email or password")
    if not u["email_verified"]:
        raise HTTPException(status_code=403, detail="please verify your email first")
    token = make_session(u["id"], u["household_id"])
    set_session_cookie(response, token)
    return {"token": token, "user": public_user(u)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session", path="/")
    return {"ok": True}


# ---- password reset --------------------------------------------------------

@router.post("/forgot")
def forgot(body: EmailBody, bg: BackgroundTasks):
    email = _norm_email(body.email)
    with db.pool.connection() as c:
        u = c.execute("SELECT id, display_name FROM users WHERE lower(email) = %s", (email,)).fetchone()
        if u:
            raw = new_token()
            c.execute("INSERT INTO email_tokens (kind, email, user_id, token_hash, expires_at)"
                      " VALUES ('reset', %s, %s, %s, now() + interval '1 hour')", (email, u["id"], token_hash(raw)))
            bg.add_task(mailer.send_reset_email, email, u["display_name"], f"{BASE_URL}/?reset={raw}")
    return {"status": "sent"}  # always 200 — no account enumeration


@router.post("/reset")
def reset(body: ResetBody, response: Response):
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="password must be at least 8 characters")
    with db.pool.connection() as c:
        row = c.execute("SELECT * FROM email_tokens WHERE token_hash = %s AND kind = 'reset'"
                        " AND used_at IS NULL AND expires_at > now()", (token_hash(body.token),)).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="this reset link is invalid or expired")
        c.execute("UPDATE users SET password_hash = %s, email_verified = true, updated_at = now() WHERE id = %s",
                  (hash_password(body.password), row["user_id"]))
        c.execute("UPDATE email_tokens SET used_at = now() WHERE id = %s", (row["id"],))
        u = c.execute("SELECT * FROM users WHERE id = %s", (row["user_id"],)).fetchone()
    token = make_session(u["id"], u["household_id"])
    set_session_cookie(response, token)
    return {"token": token, "user": public_user(u)}


# ---- magic link ------------------------------------------------------------

@router.post("/magic")
def magic(body: EmailBody, bg: BackgroundTasks):
    email = _norm_email(body.email)
    with db.pool.connection() as c:
        u = c.execute("SELECT id, display_name, email_verified FROM users WHERE lower(email) = %s", (email,)).fetchone()
        if u and u["email_verified"]:
            raw = new_token()
            c.execute("INSERT INTO email_tokens (kind, email, user_id, token_hash, expires_at)"
                      " VALUES ('magic', %s, %s, %s, now() + interval '15 minutes')", (email, u["id"], token_hash(raw)))
            bg.add_task(mailer.send_magic_email, email, u["display_name"], f"{BASE_URL}/api/auth/magic/consume?token={raw}")
    return {"status": "sent"}


@router.get("/magic/consume")
def magic_consume(token: str):
    with db.pool.connection() as c:
        row = c.execute("SELECT * FROM email_tokens WHERE token_hash = %s AND kind = 'magic'"
                        " AND used_at IS NULL AND expires_at > now()", (token_hash(token),)).fetchone()
        if not row:
            return RedirectResponse(f"{BASE_URL}/?magic=failed", status_code=302)
        c.execute("UPDATE email_tokens SET used_at = now() WHERE id = %s", (row["id"],))
        u = c.execute("SELECT id, household_id FROM users WHERE id = %s", (row["user_id"],)).fetchone()
    resp = RedirectResponse(f"{BASE_URL}/?welcome=1", status_code=302)
    set_session_cookie(resp, make_session(u["id"], u["household_id"]))
    return resp


# ---- household invites -----------------------------------------------------

@me_router.post("/household/invite")
def invite(body: EmailBody, bg: BackgroundTasks, user: dict = Depends(current_user)):
    email = _norm_email(body.email)
    with db.pool.connection() as c:
        if c.execute("SELECT 1 FROM users WHERE lower(email) = %s AND household_id = %s",
                     (email, user["household_id"])).fetchone():
            raise HTTPException(status_code=409, detail="that person is already in your household")
        raw = new_token()
        c.execute("INSERT INTO invites (household_id, email, token_hash, invited_by, expires_at)"
                  " VALUES (%s, %s, %s, %s, now() + interval '7 days')",
                  (user["household_id"], email, token_hash(raw), user["id"]))
        hh = c.execute("SELECT name FROM households WHERE id = %s", (user["household_id"],)).fetchone()
    bg.add_task(mailer.send_invite_email, email, user["display_name"], hh["name"], f"{BASE_URL}/?invite={raw}")
    return {"status": "sent"}


@router.get("/invite/info")
def invite_info(token: str):
    with db.pool.connection() as c:
        row = c.execute(
            "SELECT i.email, h.name AS household FROM invites i JOIN households h ON h.id = i.household_id"
            " WHERE i.token_hash = %s AND i.accepted_at IS NULL AND i.expires_at > now()",
            (token_hash(token),)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="this invite is invalid or expired")
    return {"email": row["email"], "household": row["household"]}


@router.post("/accept-invite")
def accept_invite(body: AcceptBody, response: Response):
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="password must be at least 8 characters")
    name = (body.display_name or "").strip() or "Me"
    with db.pool.connection() as c:
        inv = c.execute("SELECT * FROM invites WHERE token_hash = %s AND accepted_at IS NULL AND expires_at > now()",
                        (token_hash(body.token),)).fetchone()
        if not inv:
            raise HTTPException(status_code=400, detail="this invite is invalid or expired")
        email = inv["email"].strip().lower()
        if c.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email,)).fetchone():
            raise HTTPException(status_code=409, detail="an account with this email already exists")
        u = c.execute(
            "INSERT INTO users (household_id, email, password_hash, display_name, role, email_verified)"
            " VALUES (%s, %s, %s, %s, 'member', true) RETURNING *",
            (inv["household_id"], email, hash_password(body.password), name)).fetchone()
        c.execute("UPDATE invites SET accepted_at = now() WHERE id = %s", (inv["id"],))
    token = make_session(u["id"], u["household_id"])
    set_session_cookie(response, token)
    return {"token": token, "user": public_user(u)}


# ---- me / household --------------------------------------------------------

class ProfileBody(BaseModel):
    display_name: str | None = None
    household_name: str | None = None


@me_router.get("/me")
def me(user: dict = Depends(current_user)):
    with db.pool.connection() as c:
        hh = c.execute("SELECT * FROM households WHERE id = %s", (user["household_id"],)).fetchone()
        members = c.execute(
            "SELECT id, display_name, email, role, email_verified FROM users"
            " WHERE household_id = %s ORDER BY created_at", (user["household_id"],)).fetchall()
        pending = c.execute(
            "SELECT email FROM invites WHERE household_id = %s AND accepted_at IS NULL AND expires_at > now()",
            (user["household_id"],)).fetchall()
    return {
        "user": public_user(user),
        "household": {"id": str(hh["id"]), "name": hh["name"]},
        "members": [{"id": str(m["id"]), "display_name": m["display_name"], "email": m["email"],
                     "role": m["role"], "verified": m["email_verified"]} for m in members],
        "pending_invites": [p["email"] for p in pending],
    }


@me_router.patch("/me")
def update_me(body: ProfileBody, user: dict = Depends(current_user)):
    with db.pool.connection() as c:
        if body.display_name and body.display_name.strip():
            c.execute("UPDATE users SET display_name = %s, updated_at = now() WHERE id = %s",
                      (body.display_name.strip(), user["id"]))
        if body.household_name and body.household_name.strip() and user["role"] == "owner":
            c.execute("UPDATE households SET name = %s WHERE id = %s",
                      (body.household_name.strip(), user["household_id"]))
    return {"ok": True}
