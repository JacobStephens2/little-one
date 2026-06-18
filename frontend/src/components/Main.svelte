<script lang="ts">
  import { settings$ } from "../lib/db";
  import { session, toggleTheme, themeStore } from "../lib/session";
  import { phase, phaseTag } from "../lib/format";
  import { I, META } from "../lib/icons";
  import type { EventType } from "../lib/types";
  import Home from "./Home.svelte";
  import Timeline from "./Timeline.svelte";
  import Tools from "./Tools.svelte";
  import SettingsView from "./Settings.svelte";
  import Sheet from "./Sheet.svelte";
  import LogForm from "./LogForm.svelte";
  import EventDetail from "./EventDetail.svelte";
  import KickCounter from "./tools/KickCounter.svelte";
  import ContractionTimer from "./tools/ContractionTimer.svelte";
  import GrowthChart from "./tools/GrowthChart.svelte";
  import Ultrasounds from "./tools/Ultrasounds.svelte";
  import Appointments from "./tools/Appointments.svelte";

  let view = $state<"home" | "timeline" | "tools" | "settings">("home");
  let sheet = $state<{ kind: string; type?: EventType; id?: string } | null>(null);
  const open = (s: any) => (sheet = s);
  const close = () => (sheet = null);

  const settings = $derived($settings$);
  const isNight = $derived($themeStore === "night");

  const chooserOpts = $derived<EventType[]>(
    phase(settings) === "baby"
      ? ["feed", "diaper", "sleep", "pump", "measurement", "milestone", "appointment", "note"]
      : ["kick", "contraction", "ultrasound", "weight", "symptom", "appointment", "milestone", "note"]);

  function nav(v: typeof view) { view = v; window.scrollTo(0, 0); }
</script>

<div id="app">
  <header class="topbar">
    <div class="brand">
      <div class="mark">{@html I.heart}</div>
      <div><h1>{settings.baby_name || "Little One"}</h1><small>{phaseTag(settings)}</small></div>
    </div>
    <button class="icon-btn" aria-label="Toggle night mode" onclick={toggleTheme}>
      {@html isNight ? I.sun : I.moon}
    </button>
  </header>

  <main>
    {#if view === "home"}
      <Home {open} />
    {:else if view === "timeline"}
      <Timeline {open} />
    {:else if view === "tools"}
      <Tools {open} />
    {:else}
      <SettingsView />
    {/if}
  </main>

  {#if view !== "settings"}
    <button class="fab" aria-label="Log something" onclick={() => open({ kind: "chooser" })}>{@html I.plus}</button>
  {/if}

  <div class="nav"><div class="bar">
    <button class:on={view === "home"} onclick={() => nav("home")}>{@html I.home}<span>Home</span></button>
    <button class:on={view === "timeline"} onclick={() => nav("timeline")}>{@html I.list}<span>Timeline</span></button>
    <button class:on={view === "tools"} onclick={() => nav("tools")}>{@html I.tools}<span>Tools</span></button>
    <button class:on={view === "settings"} onclick={() => nav("settings")}>{@html I.gear}<span>Settings</span></button>
  </div></div>
</div>

{#if sheet?.kind === "chooser"}
  <Sheet onclose={close}>
    <h3>Log something</h3><p class="sub">What would you like to record?</p>
    <div class="quick-grid">
      {#each chooserOpts as t}
        <button class="quick {META[t].tint}" onclick={() => open({ kind: "log", type: t })}>
          <span class="qi">{@html META[t].icon}</span><span class="qt">{META[t].label}</span>
        </button>
      {/each}
    </div>
  </Sheet>
{:else if sheet?.kind === "log"}
  <LogForm type={sheet.type!} onclose={close} />
{:else if sheet?.kind === "event"}
  <EventDetail id={sheet.id!} onclose={close} />
{:else if sheet?.kind === "kick"}
  <KickCounter onclose={close} />
{:else if sheet?.kind === "contraction"}
  <ContractionTimer onclose={close} />
{:else if sheet?.kind === "growth"}
  <GrowthChart onclose={close} {open} />
{:else if sheet?.kind === "ultrasounds"}
  <Ultrasounds onclose={close} {open} />
{:else if sheet?.kind === "appts"}
  <Appointments onclose={close} {open} />
{/if}
