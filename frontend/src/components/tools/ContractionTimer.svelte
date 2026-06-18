<script lang="ts">
  import { onDestroy } from "svelte";
  import { events$, createEvent } from "../../lib/db";
  import { fmtDur } from "../../lib/format";
  import { toast } from "../../lib/toast";
  import Sheet from "../Sheet.svelte";

  let { onclose } = $props<{ onclose: () => void }>();

  // recent contractions from the synced log, plus any we add this session
  let session = $state<{ ts: number; dur: number; gap: number | null }[]>([]);
  const recent = $derived(
    [...session, ...$events$.filter((e) => e.type === "contraction").map((e) => ({ ts: +new Date(e.ts), dur: e.data.duration_sec, gap: e.data.since_last_sec ?? null }))]
      .sort((a, b) => b.ts - a.ts).slice(0, 8));

  let running = $state(false);
  let start = 0;
  let elapsed = $state(0);
  const timer = setInterval(() => { if (running) elapsed = (Date.now() - start) / 1000; }, 200);
  onDestroy(() => clearInterval(timer));

  const avgDur = $derived(recent.length ? recent.reduce((s, x) => s + x.dur, 0) / recent.length : 0);
  const gaps = $derived(recent.map((x) => x.gap).filter((g): g is number => !!g));
  const avgGap = $derived(gaps.length ? gaps.reduce((s, x) => s + x, 0) / gaps.length : 0);

  async function toggle() {
    if (!running) { running = true; start = Date.now(); elapsed = 0; }
    else {
      running = false;
      const dur = Math.round((Date.now() - start) / 1000);
      const prev = recent[0];
      const gap = prev ? Math.round((start - prev.ts) / 1000) : null;
      session = [{ ts: start, dur, gap }, ...session];
      await createEvent("contraction", { duration_sec: dur, since_last_sec: gap });
      toast("Contraction logged ✓");
    }
  }
</script>

<Sheet {onclose}>
  <h3>Contraction timer</h3>
  <p class="sub">Hold tight. Press start when one begins, stop when it ends.</p>
  <div class="timer-face"><div class="tlab">{running ? "contraction" : "ready"}</div><div class="tval" class:pulse={running}>{fmtDur(elapsed)}</div></div>
  <button class="btn {running ? 'danger' : 'primary'}" type="button" style="margin-bottom:8px" onclick={toggle}>{running ? "Stop" : "Start contraction"}</button>
  {#if recent.length}
    <div class="card" style="margin-top:14px;padding:16px">
      <div class="glance">
        <div class="g"><div class="gl">Avg length</div><div class="gv">{fmtDur(avgDur).split(" ")[0]}</div></div>
        <div class="g"><div class="gl">Avg apart</div><div class="gv">{avgGap ? fmtDur(avgGap).split(" ")[0] : "—"}</div></div>
        <div class="g"><div class="gl">Logged</div><div class="gv">{recent.length}</div></div>
      </div>
      <p class="tiny" style="margin-top:12px;text-align:center">Call your provider about the 5-1-1 rule: contractions ~5 min apart, lasting ~1 min, for 1 hour.</p>
    </div>
  {/if}
  <div class="btn-row" style="margin-top:14px"><button class="btn ghost" type="button" onclick={onclose}>Done</button></div>
</Sheet>
