<script lang="ts">
  import { settings$, createEvent } from "../lib/db";
  import { units } from "../lib/format";
  import { toast } from "../lib/toast";
  import { META } from "../lib/icons";
  import type { EventType } from "../lib/types";
  import Sheet from "./Sheet.svelte";

  let { type, onclose } = $props<{ type: EventType; onclose: () => void }>();
  const s = $derived($settings$);
  const U = $derived(units(s));

  function nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

  // form state
  let method = $state<"breast" | "bottle">("breast");
  let side = $state("left");
  let kind = $state(type === "feed" ? "breast milk" : "wet");
  let severity = $state("mild");
  let minutes = $state(""), amount = $state(""), value = $state("");
  let weight = $state(""), height = $state(""), head = $state("");
  let crl = $state(""), fhr = $state(""), usW = $state(""), usD = $state("");
  let tag = $state("Nausea");
  let title = $state(""), location = $state(""), note = $state("");
  let ts = $state(nowLocal()), startAt = $state(nowLocal()), endAt = $state(nowLocal()), when = $state(nowLocal());

  const symptoms = ["Nausea", "Fatigue", "Heartburn", "Back pain", "Cramping", "Swelling", "Headache", "Cravings", "Trouble sleeping", "Braxton Hicks", "Other"];

  async function startSleepNow() { await createEvent("sleep", {}); toast("Sleep started 🌙"); onclose(); }

  async function submit(e: Event) {
    e.preventDefault();
    let data: Record<string, any> = {}, evNote: string | null = note || null, evTs = new Date(ts);
    if (type === "feed") {
      if (method === "bottle") data = { method: "bottle", amount_ml: U.vol.toC(parseFloat(amount) || 0), kind };
      else data = { method: "breast", side, minutes: parseInt(minutes) || null };
    } else if (type === "diaper") data = { kind };
    else if (type === "sleep") {
      const st = new Date(startAt), en = new Date(endAt);
      if (en < st) { toast("Wake time is before sleep time"); return; }
      evTs = st; data = { end: en.toISOString() };
    } else if (type === "pump") data = { amount_ml: U.vol.toC(parseFloat(amount) || 0), side };
    else if (type === "weight") data = { kg: U.mass.toC(parseFloat(value) || 0) };
    else if (type === "measurement") {
      if (weight) data.weight_kg = U.mass.toC(parseFloat(weight));
      if (height) data.height_cm = U.len.toC(parseFloat(height));
      if (head) data.head_cm = U.len.toC(parseFloat(head));
      if (!Object.keys(data).length) { toast("Enter at least one measurement"); return; }
    } else if (type === "ultrasound") {
      if (crl) data.crl_mm = parseFloat(crl);
      if (fhr) data.fhr_bpm = parseInt(fhr);
      if (usW) { data.ga_weeks = parseInt(usW); data.ga_days = parseInt(usD) || 0; }
      if (!Object.keys(data).length) { toast("Enter at least one measurement"); return; }
    } else if (type === "symptom") data = { tag, severity };
    else if (type === "appointment") { data = { title: title || "Appointment", when: new Date(when).toISOString(), location: location || "" }; evTs = new Date(when); }
    else if (type === "milestone") data = { title: title || "Milestone" };
    else if (type === "note") { if (!evNote) { toast("Write something first"); return; } }
    await createEvent(type, data, { ts: evTs, note: evNote });
    toast(META[type].label + " logged ✓");
    onclose();
  }
</script>

<Sheet {onclose}>
  <form onsubmit={submit}>
    <h3>{META[type].label}</h3>

    {#if type === "feed"}
      <div class="seg" style="margin-bottom:14px">
        <button type="button" class:on={method === "breast"} onclick={() => (method = "breast")}>Breast</button>
        <button type="button" class:on={method === "bottle"} onclick={() => (method = "bottle")}>Bottle</button>
      </div>
      {#if method === "breast"}
        <label class="fld"><span class="lt">Side</span>
          <div class="seg">{#each ["left", "right", "both"] as o}<button type="button" class:on={side === o} onclick={() => (side = o)}>{o[0].toUpperCase() + o.slice(1)}</button>{/each}</div>
        </label>
        <label class="fld"><span class="lt">Minutes</span><input type="number" inputmode="numeric" bind:value={minutes} placeholder="15" /></label>
      {:else}
        <label class="fld"><span class="lt">Amount ({U.vol.u})</span><input type="number" step="0.1" inputmode="decimal" bind:value={amount} placeholder={U.imperial ? "3" : "90"} /></label>
        <label class="fld"><span class="lt">Kind</span>
          <div class="seg"><button type="button" class:on={kind === "breast milk"} onclick={() => (kind = "breast milk")}>Breast milk</button><button type="button" class:on={kind === "formula"} onclick={() => (kind = "formula")}>Formula</button></div>
        </label>
      {/if}
      {@render tsField("When")}
    {/if}

    {#if type === "diaper"}
      <label class="fld"><span class="lt">What's in there?</span>
        <div class="seg">{#each ["wet", "dirty", "both"] as o}<button type="button" class:on={kind === o} onclick={() => (kind = o)}>{o === "both" ? "Both" : o[0].toUpperCase() + o.slice(1)}</button>{/each}</div>
      </label>
      {@render tsField("When")}{@render noteField()}
    {/if}

    {#if type === "sleep"}
      <p class="sub">Start a nap now, or log one that already happened.</p>
      <button class="btn primary" type="button" style="margin-bottom:16px" onclick={startSleepNow}>Start sleep now</button>
      <div class="row-between" style="margin-bottom:12px"><span class="tiny">or log a finished sleep</span></div>
      <label class="fld"><span class="lt">Fell asleep</span><input type="datetime-local" bind:value={startAt} /></label>
      <label class="fld"><span class="lt">Woke up</span><input type="datetime-local" bind:value={endAt} /></label>
    {/if}

    {#if type === "pump"}
      <label class="fld"><span class="lt">Amount ({U.vol.u})</span><input type="number" step="0.1" inputmode="decimal" bind:value={amount} placeholder={U.imperial ? "4" : "120"} /></label>
      <label class="fld"><span class="lt">Side</span><div class="seg">{#each ["left", "right", "both"] as o}<button type="button" class:on={side === o} onclick={() => (side = o)}>{o[0].toUpperCase() + o.slice(1)}</button>{/each}</div></label>
      {@render tsField("When")}
    {/if}

    {#if type === "weight"}
      <label class="fld"><span class="lt">Weight ({U.mass.u})</span><input type="number" step="0.1" inputmode="decimal" bind:value /></label>
      {@render tsField("Date")}
    {/if}

    {#if type === "measurement"}
      <p class="sub">Fill in what you measured.</p>
      <label class="fld"><span class="lt">Weight ({U.mass.u})</span><input type="number" step="0.01" inputmode="decimal" bind:value={weight} /></label>
      <label class="fld"><span class="lt">Length ({U.len.u})</span><input type="number" step="0.1" inputmode="decimal" bind:value={height} /></label>
      <label class="fld"><span class="lt">Head circumference ({U.len.u})</span><input type="number" step="0.1" inputmode="decimal" bind:value={head} /></label>
      {@render tsField("Date")}
    {/if}

    {#if type === "ultrasound"}
      <p class="sub">Log measurements from your scan.</p>
      <label class="fld"><span class="lt">Crown-rump length (mm)</span><input type="number" step="0.1" inputmode="decimal" bind:value={crl} placeholder="e.g. 23" /></label>
      <label class="fld"><span class="lt">Heartbeat (bpm)</span><input type="number" step="1" inputmode="numeric" bind:value={fhr} placeholder="e.g. 150" /></label>
      <label class="fld"><span class="lt">Gestational age by scan <span class="tiny">(optional)</span></span>
        <div style="display:flex;gap:10px"><input type="number" inputmode="numeric" bind:value={usW} placeholder="weeks" /><input type="number" inputmode="numeric" bind:value={usD} placeholder="days" /></div>
      </label>
      {@render tsField("Scan date")}{@render noteField()}
    {/if}

    {#if type === "symptom"}
      <label class="fld"><span class="lt">What are you feeling?</span><select bind:value={tag}>{#each symptoms as o}<option>{o}</option>{/each}</select></label>
      <label class="fld"><span class="lt">Severity</span><div class="seg">{#each ["mild", "moderate", "strong"] as o}<button type="button" class:on={severity === o} onclick={() => (severity = o)}>{o[0].toUpperCase() + o.slice(1)}</button>{/each}</div></label>
      {@render tsField("When")}{@render noteField()}
    {/if}

    {#if type === "appointment"}
      <label class="fld"><span class="lt">Title</span><input bind:value={title} placeholder="20-week ultrasound" /></label>
      <label class="fld"><span class="lt">When</span><input type="datetime-local" bind:value={when} /></label>
      <label class="fld"><span class="lt">Location</span><input bind:value={location} placeholder="Dr. office" /></label>
      {@render noteField()}
    {/if}

    {#if type === "milestone"}
      <label class="fld"><span class="lt">What happened?</span><input bind:value={title} placeholder="First smile" /></label>
      {@render tsField("Date")}{@render noteField()}
    {/if}

    {#if type === "note"}
      <label class="fld"><span class="lt">Your note</span><textarea bind:value={note} placeholder="A little memory…"></textarea></label>
      {@render tsField("When")}
    {/if}

    <div class="btn-row">
      <button class="btn ghost" type="button" onclick={onclose}>Cancel</button>
      <button class="btn primary" type="submit">Save</button>
    </div>
  </form>
</Sheet>

{#snippet tsField(label: string)}
  <label class="fld"><span class="lt">{label}</span><input type="datetime-local" bind:value={ts} /></label>
{/snippet}
{#snippet noteField()}
  <label class="fld"><span class="lt">Note <span class="tiny">(optional)</span></span><textarea bind:value={note} placeholder="Anything to remember"></textarea></label>
{/snippet}
