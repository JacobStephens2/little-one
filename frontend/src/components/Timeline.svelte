<script lang="ts">
  import { events$, settings$ } from "../lib/db";
  import { META } from "../lib/icons";
  import { phase, dayKey, dayLabel } from "../lib/format";
  import type { Ev, EventType } from "../lib/types";
  import TlItem from "./TlItem.svelte";

  let { open } = $props<{ open: (s: any) => void }>();
  const s = $derived($settings$);
  const evs = $derived($events$);
  let filter = $state<string>("all");

  const types = $derived<string[]>(
    phase(s) === "baby"
      ? ["all", "feed", "diaper", "sleep", "pump", "measurement", "milestone", "appointment", "note"]
      : ["all", "kick", "contraction", "ultrasound", "weight", "symptom", "appointment", "note"]);

  const groups = $derived.by(() => {
    const list = filter === "all" ? evs : evs.filter((e) => e.type === filter);
    const g: Record<number, Ev[]> = {};
    for (const e of list) { const k = dayKey(e.ts); (g[k] ||= []).push(e); }
    return Object.keys(g).map(Number).sort((a, b) => b - a).map((k) => ({ k, items: g[k] }));
  });
</script>

<div class="chips">
  {#each types as t}
    <button class="chip" class:on={filter === t} onclick={() => (filter = t)}>{t === "all" ? "Everything" : META[t as EventType]?.label || t}</button>
  {/each}
</div>

{#if groups.length}
  {#each groups as grp (grp.k)}
    <div class="tl-day-label">{dayLabel(grp.k)}</div>
    {#each grp.items as ev (ev.id)}<TlItem {ev} onopen={(e) => open({ kind: "event", id: e.id })} />{/each}
  {/each}
{:else}
  <div class="empty"><span class="e-emoji">📖</span><p>No entries here yet</p></div>
{/if}
