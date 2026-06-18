"""Reminder sweeper, run on a systemd timer (e.g. every 15 min).

Sends Web Push for:
  - appointments starting within the next hour (once each), and
  - feeds, if a household enabled `feed_reminder_hours` and the last feed is older
    than that interval (rate-limited to once per interval).

Usage: python reminders.py   (loads .env into the environment first via systemd)
"""
from __future__ import annotations

import os
import sys

# Make sibling modules importable when run as a script from the service dir.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import db          # noqa: E402
from push import send_to_user  # noqa: E402


def notify_household(c, household_id, title: str, body: str, url: str = "/") -> None:
    users = c.execute("SELECT id FROM users WHERE household_id = %s AND email_verified", (household_id,)).fetchall()
    for u in users:
        send_to_user(u["id"], title, body, url)


def run() -> None:
    db.init_pool()
    with db.pool.connection() as c:
        # --- appointment reminders (within the next hour, once) ---
        appts = c.execute(
            """SELECT id, household_id, data FROM events
               WHERE type = 'appointment' AND deleted_at IS NULL
                 AND (data->>'when')::timestamptz BETWEEN now() AND now() + interval '1 hour'"""
        ).fetchall()
        for a in appts:
            kind = f"appt:{a['id']}"
            fresh = c.execute(
                "INSERT INTO reminders_sent (household_id, kind) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING 1",
                (a["household_id"], kind)).fetchone()
            if fresh:
                title = a["data"].get("title") or "Appointment"
                notify_household(c, a["household_id"], "Upcoming appointment", f"{title} is coming up soon.", "/")

        # --- feed reminders (opt-in per household) ---
        households = c.execute(
            "SELECT household_id, (data->>'feed_reminder_hours')::float AS hrs FROM settings"
            " WHERE (data->>'feed_reminder_hours') IS NOT NULL AND (data->>'feed_reminder_hours') <> ''").fetchall()
        for h in households:
            hrs = h["hrs"] or 0
            if hrs <= 0:
                continue
            last_feed = c.execute(
                "SELECT max(ts) AS t FROM events WHERE household_id = %s AND type = 'feed' AND deleted_at IS NULL",
                (h["household_id"],)).fetchone()["t"]
            if not last_feed:
                continue
            due = c.execute(
                "SELECT now() - %s > make_interval(hours => %s) AS due", (last_feed, int(hrs))).fetchone()["due"]
            if not due:
                continue
            # rate-limit: only once per interval window
            recent = c.execute(
                "SELECT sent_at > now() - make_interval(hours => %s) AS r FROM reminders_sent"
                " WHERE household_id = %s AND kind = 'feed'", (int(hrs), h["household_id"])).fetchone()
            if recent and recent["r"]:
                continue
            c.execute(
                "INSERT INTO reminders_sent (household_id, kind) VALUES (%s, 'feed')"
                " ON CONFLICT (household_id, kind) DO UPDATE SET sent_at = now()", (h["household_id"],))
            notify_household(c, h["household_id"], "Feeding reminder",
                             f"It's been over {hrs:g}h since the last feed.", "/")


if __name__ == "__main__":
    run()
