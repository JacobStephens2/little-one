<script lang="ts">
  import { onDestroy } from "svelte";
  import { createEvent } from "../../lib/db";
  import { fmtDur } from "../../lib/format";
  import { toast } from "../../lib/toast";
  import Sheet from "../Sheet.svelte";

  let { onclose } = $props<{ onclose: () => void }>();
  let count = $state(0);
  let start = Date.now();
  let elapsed = $state(0);
  const timer = setInterval(() => (elapsed = (Date.now() - start) / 1000), 1000);
  onDestroy(() => clearInterval(timer));

  function tap() { count++; if (navigator.vibrate) navigator.vibrate(15); }
  async function save() {
    if (!count) { toast("Tap at least one kick"); return; }
    await createEvent("kick", { count, duration_sec: Math.round((Date.now() - start) / 1000) });
    toast("Kick session saved ✓"); onclose();
  }
</script>

<Sheet {onclose}>
  <h3>Kick counter</h3>
  <p class="sub">Tap the circle each time you feel a movement. Many providers suggest timing how long 10 kicks take.</p>
  <button class="big-tap pulse" onclick={tap}><span class="n">{count}</span><span class="l">tap for a kick</span></button>
  <div class="timer-face"><div class="tlab">elapsed</div><div class="tval" style="font-size:2.4rem">{fmtDur(elapsed)}</div></div>
  <div class="btn-row">
    <button class="btn ghost" type="button" onclick={onclose}>Cancel</button>
    <button class="btn primary" type="button" onclick={save}>Save session</button>
  </div>
</Sheet>
