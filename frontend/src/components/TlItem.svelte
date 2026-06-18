<script lang="ts">
  import { settings$ } from "../lib/db";
  import { META } from "../lib/icons";
  import { summary, fmtClock, timeAgo } from "../lib/format";
  import type { Ev } from "../lib/types";
  let { ev, onopen } = $props<{ ev: Ev; onopen?: (ev: Ev) => void }>();
  const s = $derived($settings$);
  const m = $derived(META[ev.type] || META.note);
</script>

<div class="tl-item" class:pending={ev._dirty} role="button" tabindex="0" onclick={() => onopen?.(ev)} onkeydown={(e) => e.key === "Enter" && onopen?.(ev)}>
  <div class="ti {m.tint}" style="display:grid;place-items:center">{@html m.icon}</div>
  <div class="tb">
    <div class="tt">{m.label}</div>
    <div class="ts">{summary(ev, s)}{ev.note && ev.type !== "note" ? " · " + ev.note : ""}{ev.logged_by ? " · " + ev.logged_by : ""}</div>
  </div>
  <div class="tr"><div class="time">{fmtClock(ev.ts)}</div><div class="ago">{timeAgo(ev.ts)}</div></div>
</div>
