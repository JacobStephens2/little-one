export type EventType =
  | "feed" | "diaper" | "sleep" | "pump" | "kick" | "contraction"
  | "weight" | "symptom" | "appointment" | "milestone" | "measurement"
  | "ultrasound" | "note";

export interface Ev {
  id: string;                 // client-generated UUID
  type: EventType;
  ts: string;                 // ISO
  data: Record<string, any>;
  note: string | null;
  logged_by: string | null;
  seq?: number;               // server cursor position (absent until synced)
  deleted_at?: string | null; // tombstone
  _dirty?: 0 | 1;             // 1 = needs push
}

export interface Settings {
  baby_name?: string;
  lmp_date?: string | null;
  conception_date?: string | null;
  age_pref?: "embryonic" | "gestational";
  birth_date?: string | null;
  due_date?: string | null;
  units?: "imperial" | "metric";
  feed_reminder_hours?: number | null;
}

export interface Member {
  id: string; display_name: string; email: string; role: string; verified: boolean;
}
export interface Session {
  user: { id: string; email: string; display_name: string; role: string; household_id: string };
  household: { id: string; name: string };
  members: Member[];
  pending_invites: string[];
}

export interface WeekInfo { emoji: string; fruit: string; size: string; note: string; }
export interface AgeParts { days: number; weeks: number; rem: number; }
