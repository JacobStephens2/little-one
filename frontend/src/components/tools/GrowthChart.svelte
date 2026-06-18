<script lang="ts">
  import { events$, settings$ } from "../../lib/db";
  import { phase, units } from "../../lib/format";
  import Sheet from "../Sheet.svelte";
  import LineChart from "./LineChart.svelte";

  let { onclose, open } = $props<{ onclose: () => void; open: (s: any) => void }>();
  const s = $derived($settings$);
  const isBaby = $derived(phase(s) === "baby");
  const U = $derived(units(s));
  const points = $derived(
    $events$.filter((e) => (isBaby ? e.type === "measurement" && e.data.weight_kg : e.type === "weight"))
      .map((e) => ({ t: +new Date(e.ts), v: U.mass.fromC(isBaby ? e.data.weight_kg : e.data.kg) }))
      .sort((a, b) => a.t - b.t));
</script>

<Sheet {onclose}>
  <h3>{isBaby ? "Growth" : "Weight"} chart</h3>
  <p class="sub">{isBaby ? "Your baby's weight over time." : "Your weight through pregnancy."}</p>
  {#if points.length >= 2}
    <LineChart {points} unit={U.mass.u} />
  {:else}
    <div class="empty"><span class="e-emoji">📈</span><p>{points.length ? "Log one more to see a trend" : "No measurements logged yet"}</p></div>
  {/if}
  <div class="btn-row" style="margin-top:8px">
    <button class="btn ghost" type="button" onclick={onclose}>Close</button>
    <button class="btn primary" type="button" onclick={() => open({ kind: "log", type: isBaby ? "measurement" : "weight" })}>Add {isBaby ? "measurement" : "weight"}</button>
  </div>
</Sheet>
