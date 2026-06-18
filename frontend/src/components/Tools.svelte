<script lang="ts">
  import { settings$ } from "../lib/db";
  import { META } from "../lib/icons";
  import { phase } from "../lib/format";
  let { open } = $props<{ open: (s: any) => void }>();
  const s = $derived($settings$);
  const isBaby = $derived(phase(s) === "baby");

  const cards = $derived([
    ...(!isBaby ? [
      { type: "kick", title: "Kick counter", desc: "Count 10 movements and time how long it takes.", kind: "kick" },
      { type: "contraction", title: "Contraction timer", desc: "Time contractions and watch for the 5-1-1 pattern.", kind: "contraction" },
      { type: "ultrasound", title: "Ultrasound history", desc: "Crown-rump length, heartbeat, and scan dates.", kind: "ultrasounds" },
    ] : []),
    { type: "measurement", title: isBaby ? "Growth chart" : "Weight chart", desc: isBaby ? "See your baby's weight over time." : "Track your weight through pregnancy.", kind: "growth" },
    { type: "appointment", title: "All appointments", desc: "Past and upcoming visits in one place.", kind: "appts" },
  ]);
</script>

<div class="sec-head"><h3>Tools</h3></div>
<div class="stack">
  {#each cards as c}
    <button class="card {META[c.type].tint}" style="display:flex;gap:16px;align-items:center;text-align:left;width:100%" onclick={() => open({ kind: c.kind })}>
      <span class="qi" style="width:48px;height:48px;border-radius:15px;flex:none">{@html META[c.type].icon}</span>
      <span style="flex:1"><span class="display" style="font-size:1.2rem;display:block">{c.title}</span><span class="muted">{c.desc}</span></span>
    </button>
  {/each}
</div>
