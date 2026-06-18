<script lang="ts">
  import { events$, settings$ } from "../../lib/db";
  import { summary } from "../../lib/format";
  import { I } from "../../lib/icons";
  import Sheet from "../Sheet.svelte";
  import LineChart from "./LineChart.svelte";

  let { onclose, open } = $props<{ onclose: () => void; open: (s: any) => void }>();
  const s = $derived($settings$);
  const us = $derived($events$.filter((e) => e.type === "ultrasound").sort((a, b) => +new Date(b.ts) - +new Date(a.ts)));
  const crl = $derived(us.filter((e) => e.data.crl_mm != null).map((e) => ({ t: +new Date(e.ts), v: e.data.crl_mm })).sort((a, b) => a.t - b.t));
</script>

<Sheet {onclose}>
  <h3>Ultrasounds</h3>
  {#if crl.length >= 2}
    <p class="sub">Crown-rump length over time</p>
    <LineChart points={crl} unit="mm" />
  {/if}
  {#if us.length}
    {#each us as e (e.id)}
      <div class="tl-item">
        <div class="ti t-sky" style="display:grid;place-items:center">{@html I.ultrasound}</div>
        <div class="tb"><div class="tt">{summary(e, s)}</div><div class="ts">{new Date(e.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}{e.note ? " · " + e.note : ""}</div></div>
      </div>
    {/each}
  {:else}
    <div class="empty"><span class="e-emoji">🩺</span><p>No ultrasounds logged yet</p></div>
  {/if}
  <div class="btn-row" style="margin-top:14px">
    <button class="btn ghost" type="button" onclick={onclose}>Close</button>
    <button class="btn primary" type="button" onclick={() => open({ kind: "log", type: "ultrasound" })}>Add scan</button>
  </div>
</Sheet>
