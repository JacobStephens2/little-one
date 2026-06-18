<script lang="ts">
  import { events$ } from "../../lib/db";
  import { I } from "../../lib/icons";
  import { fmtClock } from "../../lib/format";
  import Sheet from "../Sheet.svelte";

  let { onclose, open } = $props<{ onclose: () => void; open: (s: any) => void }>();
  const all = $derived($events$.filter((e) => e.type === "appointment"));
  const now = Date.now();
  const up = $derived(all.filter((e) => +new Date(e.data.when) >= now).sort((a, b) => +new Date(a.data.when) - +new Date(b.data.when)));
  const past = $derived(all.filter((e) => +new Date(e.data.when) < now).sort((a, b) => +new Date(b.data.when) - +new Date(a.data.when)));
</script>

{#snippet row(e: any)}
  <div class="tl-item">
    <div class="ti t-sky" style="display:grid;place-items:center">{@html I.appointment}</div>
    <div class="tb"><div class="tt">{e.data.title}</div><div class="ts">{e.data.location || ""}</div></div>
    <div class="tr"><div class="time">{new Date(e.data.when).toLocaleDateString([], { month: "short", day: "numeric" })}</div><div class="ago">{fmtClock(e.data.when)}</div></div>
  </div>
{/snippet}

<Sheet {onclose}>
  <h3>Appointments</h3>
  {#if up.length}<div class="tl-day-label">Upcoming</div>{#each up as e (e.id)}{@render row(e)}{/each}{/if}
  {#if past.length}<div class="tl-day-label">Past</div>{#each past as e (e.id)}{@render row(e)}{/each}{/if}
  {#if !all.length}<div class="empty"><span class="e-emoji">🗓️</span><p>No appointments yet</p></div>{/if}
  <div class="btn-row" style="margin-top:14px">
    <button class="btn ghost" type="button" onclick={onclose}>Close</button>
    <button class="btn primary" type="button" onclick={() => open({ kind: "log", type: "appointment" })}>Add</button>
  </div>
</Sheet>
