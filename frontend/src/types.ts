// Shared types for the baby.stephens.page frontend.

export type EventType =
  | "feed" | "diaper" | "sleep" | "pump" | "kick" | "contraction"
  | "weight" | "symptom" | "appointment" | "milestone" | "measurement"
  | "ultrasound" | "note";

export interface Ev {
  id: number | string;          // server id (number) or "tmp-N" while pending
  type: EventType;
  ts: string;                   // ISO timestamp
  data: Record<string, any>;    // type-specific payload, owned by the frontend
  note: string | null;
  logged_by: string | null;
  created_at?: string;
  updated_at?: string;
  _pending?: boolean;           // queued locally, not yet on the server
}

export interface Settings {
  baby_name?: string;
  lmp_date?: string | null;          // first day of last period → gestational age
  conception_date?: string | null;   // → embryonic age
  age_pref?: "embryonic" | "gestational";
  birth_date?: string | null;        // set → baby mode
  due_date?: string | null;          // legacy / derived
  units?: "imperial" | "metric";
}

export interface QueueJob {
  tmpId: string;
  payload: {
    type: EventType;
    data: Record<string, any>;
    ts: string;
    note: string | null;
    logged_by: string | null;
  };
}

export type ViewName = "home" | "timeline" | "tools" | "settings";

export interface AppState {
  token: string | null;
  me: string;
  view: ViewName;
  filter: string;
  settings: Settings;
  events: Ev[];
  queue: QueueJob[];
  online: boolean;
}

export interface WeekInfo {
  emoji: string;
  fruit: string;
  size: string;
  note: string;
}

export interface AgeParts {
  days: number;
  weeks: number;
  rem: number;
}
