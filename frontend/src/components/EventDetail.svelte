<script lang="ts">
  import { events$, settings$, deleteEvent, updateEvent } from "../lib/db";
  import { META } from "../lib/icons";
  import { summary } from "../lib/format";
  import { toast } from "../lib/toast";
  import Sheet from "./Sheet.svelte";

  let { id, onclose } = $props<{ id: string; onclose: () => void }>();
  const ev = $derived($events$.find((e) => e.id === id));
  const s = $derived($settings$);

  async function wake() {
    if (!ev) return;
    await updateEvent(id, { data: { ...ev.data, end: new Date().toISOString() } });
    toast("Good morning ☀️"); onclose();
  }
  async function remove() { await deleteEvent(id); toast("Deleted"); onclose(); }
</script>

<Sheet {onclose}>
  {#if ev}
    {@const m = META[ev.type]}
    <h3>{m.label}</h3>
    <div class="tl-item" style="margin-bottom:16px">
      <div class="ti {m.tint}" style="display:grid;place-items:center">{@html m.icon}</div>
      <div class="tb"><div class="tt">{summary(ev, s)}</div><div class="ts">{new Date(ev.ts).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{ev.logged_by ? " · " + ev.logged_by : ""}</div></div>
    </div>
    {#if ev.note}<p class="muted" style="margin-top:0">{ev.note}</p>{/if}
    {#if ev._dirty}<p class="tiny">⟳ Saving when you're back online…</p>{/if}
    {#if ev.type === "sleep" && !ev.data.end}
      <button class="btn primary" style="margin-bottom:10px" onclick={wake}>Wake up now</button>
    {/if}
    <div class="btn-row">
      <button class="btn ghost" type="button" onclick={onclose}>Close</button>
      <button class="btn danger" type="button" onclick={remove}>Delete</button>
    </div>
  {/if}
</Sheet>
